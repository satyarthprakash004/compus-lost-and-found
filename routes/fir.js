const express   = require('express');
const router    = express.Router();
const FirReport = require('../models/FirReport');
const auth      = require('../middleware/auth');

// POST /api/fir
router.post('/', auth, async (req, res) => {
  const { lostItemId, description, policeStation, firNumber } = req.body;
  if (!description)
    return res.status(400).json({ success: false, message: 'Description is required.' });

  try {
    const report = await FirReport.create({
      reportedBy: req.user._id,
      lostItem:   lostItemId || undefined,
      description, policeStation, firNumber,
    });
    res.status(201).json({ success: true, message: 'FIR report saved.', report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/fir/my
router.get('/my', auth, async (req, res) => {
  try {
    const reports = await FirReport.find({ reportedBy: req.user._id })
      .populate('lostItem', 'title locationLost')
      .sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/fir/:id  — add FIR number / update status
router.patch('/:id', auth, async (req, res) => {
  try {
    const report = await FirReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (String(report.reportedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { firNumber, policeStation, status } = req.body;
    if (firNumber)     report.firNumber     = firNumber;
    if (policeStation) report.policeStation = policeStation;
    if (status && ['pending','filed','resolved'].includes(status)) report.status = status;

    await report.save();
    res.json({ success: true, message: 'FIR report updated.', report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
