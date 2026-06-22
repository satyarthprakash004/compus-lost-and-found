const express   = require('express');
const router    = express.Router();
const Match     = require('../models/Match');
const LostItem  = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const auth      = require('../middleware/auth');

// POST /api/matches  — claim a found item matches a lost item
router.post('/', auth, async (req, res) => {
  const { lostItemId, foundItemId, message } = req.body;
  if (!lostItemId || !foundItemId)
    return res.status(400).json({ success: false, message: 'lostItemId and foundItemId required.' });

  try {
    const [lost, found] = await Promise.all([
      LostItem.findById(lostItemId).populate('postedBy'),
      FoundItem.findById(foundItemId),
    ]);
    if (!lost || !found)
      return res.status(404).json({ success: false, message: 'Item not found.' });

    const match = await Match.create({ lostItem: lostItemId, foundItem: foundItemId, requestedBy: req.user._id, message });

    // Send notification to the owner of the lost item
    if (lost.postedBy && lost.postedBy.email) {
      const { sendNotification, getEmailHtmlTemplate } = require('../config/notifier');
      const ctaUrl = `${req.protocol}://${req.get('host')}/dashboard.html`;
      const bodyHtml = `
        <p>Hello <strong>${lost.postedBy.name}</strong>,</p>
        <p>Great news! Someone has reported a potential match for your lost item <strong>"${lost.title}"</strong> on the FoundIt portal.</p>
        <p>Please log in to your dashboard to view the details, contact the finder, and confirm if it matches your item.</p>
      `;
      const html = getEmailHtmlTemplate(`Match Found for "${lost.title}"`, bodyHtml, 'Go to Dashboard', ctaUrl);
      const alertMsg = `📢 FoundIt Alert! Someone found a match for your lost item "${lost.title}". Log in to check details: ${ctaUrl}`;
      sendNotification(lost.postedBy.email, `📢 Match found for "${lost.title}"`, alertMsg, html)
        .catch(err => console.error(`❌ [Email] Match notification failed:`, err.message));
    }

    res.status(201).json({ success: true, message: 'Match request sent!', match });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'You already sent a match request for this pair.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/matches/my  — matches I requested
router.get('/my', auth, async (req, res) => {
  try {
    const matches = await Match.find({ requestedBy: req.user._id })
      .populate('lostItem',  'title locationLost status')
      .populate('foundItem', 'title locationFound status')
      .sort({ createdAt: -1 });
    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/matches/received  — match requests others sent for MY lost items
router.get('/received', auth, async (req, res) => {
  try {
    // Find all lost items owned by the current user
    const myLostItems = await LostItem.find({ postedBy: req.user._id }).select('_id');
    const myLostIds = myLostItems.map(item => item._id);

    const matches = await Match.find({ lostItem: { $in: myLostIds } })
      .populate('lostItem',  'title locationLost status')
      .populate('foundItem', 'title locationFound status')
      .populate('requestedBy', 'name rollNumber phone department')
      .sort({ createdAt: -1 });
    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/matches/lost/:lostItemId  — all match requests for a lost item (owner only)
router.get('/lost/:lostItemId', auth, async (req, res) => {
  try {
    const lost = await LostItem.findById(req.params.lostItemId);
    if (!lost) return res.status(404).json({ success: false, message: 'Lost item not found.' });
    if (String(lost.postedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const matches = await Match.find({ lostItem: req.params.lostItemId })
      .populate('foundItem')
      .populate('requestedBy', 'name rollNumber phone department');
    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/matches/:id  — confirm or reject (lost item owner only)
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'rejected'].includes(status))
    return res.status(400).json({ success: false, message: 'Status must be confirmed or rejected.' });

  try {
    const match = await Match.findById(req.params.id).populate('lostItem').populate('requestedBy');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });
    if (String(match.lostItem.postedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Only the lost item owner can do this.' });

    match.status = status;
    await match.save();

    // On confirm → update both items' statuses
    if (status === 'confirmed') {
      await Promise.all([
        LostItem.findByIdAndUpdate(match.lostItem._id,    { status: 'found'    }),
        FoundItem.findByIdAndUpdate(match.foundItem,       { status: 'claimed'  }),
      ]);
    }

    // Notify the finder of confirm/reject status
    if (match.requestedBy && match.requestedBy.email) {
      const { sendNotification, getEmailHtmlTemplate } = require('../config/notifier');
      const ctaUrl = `${req.protocol}://${req.get('host')}/dashboard.html`;
      
      let bodyHtml = '';
      let subject = '';
      if (status === 'confirmed') {
        subject = `🎉 Match Request Confirmed for "${match.lostItem.title}"`;
        bodyHtml = `
          <p>Hello <strong>${match.requestedBy.name}</strong>,</p>
          <p>Fantastic news! The owner of the lost item <strong>"${match.lostItem.title}"</strong> has <strong>confirmed</strong> your match request!</p>
          <p>Thank you for helping keep your campus community safe and helping return this item. You can view the details and contact options in your dashboard.</p>
        `;
      } else {
        subject = `⚠️ Match Request Status Update for "${match.lostItem.title}"`;
        bodyHtml = `
          <p>Hello <strong>${match.requestedBy.name}</strong>,</p>
          <p>The owner of the lost item <strong>"${match.lostItem.title}"</strong> reviewed your match request and has marked it as <strong>not a match</strong>.</p>
          <p>Thank you for your effort anyway! Your post remains active in the portal for other potential matches.</p>
        `;
      }
      
      const html = getEmailHtmlTemplate(subject, bodyHtml, 'Go to Dashboard', ctaUrl);
      const alertMsg = `🎉 FoundIt Alert! Your match request for "${match.lostItem.title}" has been ${status} by the owner.`;
      sendNotification(match.requestedBy.email, subject, alertMsg, html)
        .catch(err => console.error(`❌ [Email] Status notification failed:`, err.message));
    }

    res.json({ success: true, message: `Match ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});



module.exports = router;
