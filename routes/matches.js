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
      LostItem.findById(lostItemId),
      FoundItem.findById(foundItemId),
    ]);
    if (!lost || !found)
      return res.status(404).json({ success: false, message: 'Item not found.' });

    const match = await Match.create({ lostItem: lostItemId, foundItem: foundItemId, requestedBy: req.user._id, message });
    res.status(201).json({ success: true, message: 'Match request sent!', match });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'You already sent a match request for this pair.' });
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
    const match = await Match.findById(req.params.id).populate('lostItem');
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

    res.json({ success: true, message: `Match ${status}.` });
  } catch (err) {
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

module.exports = router;
