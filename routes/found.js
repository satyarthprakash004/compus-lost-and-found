const express    = require('express');
const router     = express.Router();
const FoundItem  = require('../models/FoundItem');
const auth       = require('../middleware/auth');
const { upload, handleCloudinaryUpload, deleteFile } = require('../middleware/upload');

// GET /api/found
router.get('/', async (req, res) => {
  const { category, status = 'available', search, page = 1, limit = 12 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status)   filter.status   = status;
  if (search)   filter.$text    = { $search: search };

  try {
    const [items, total] = await Promise.all([
      FoundItem.find(filter)
        .populate('postedBy', 'name rollNumber department phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      FoundItem.countDocuments(filter),
    ]);
    res.json({ success: true, items, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/found/my
router.get('/my', auth, async (req, res) => {
  try {
    const items = await FoundItem.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/found/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id)
      .populate('postedBy', 'name rollNumber department phone');
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/found
router.post('/', auth, upload.single('image'), handleCloudinaryUpload, async (req, res) => {
  const { title, description, category, locationFound, dateFound, contactInfo, currentlyAt, latitude, longitude, handoverSpot } = req.body;
  if (!title || !category || !locationFound || !dateFound)
    return res.status(400).json({ success: false, message: 'Title, category, location and date are required.' });

  try {
    const item = await FoundItem.create({
      postedBy: req.user._id,
      title, description, category, locationFound,
      dateFound: new Date(dateFound),
      imageUrl: req.file ? req.file.url : undefined,
      contactInfo, currentlyAt,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      handoverSpot: handoverSpot ? String(handoverSpot).trim() : undefined,
    });
    res.status(201).json({ success: true, message: 'Found item posted!', item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/found/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  if (!['available', 'claimed', 'closed'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status.' });

  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    if (String(item.postedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    item.status = status;
    await item.save();
    res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/found/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    if (String(item.postedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await deleteFile(item.imageUrl);
    await item.deleteOne();
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
