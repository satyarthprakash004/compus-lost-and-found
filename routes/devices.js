const express       = require('express');
const router        = express.Router();
const BlockedDevice = require('../models/BlockedDevice');
const auth          = require('../middleware/auth');

// POST /api/devices  — block a device
router.post('/', auth, async (req, res) => {
  const { lostItemId, deviceType, brand, model, imeiNumber, serialNumber, reason } = req.body;
  if (!deviceType)
    return res.status(400).json({ success: false, message: 'Device type is required.' });
  if (!imeiNumber && !serialNumber)
    return res.status(400).json({ success: false, message: 'Provide at least IMEI or serial number.' });

  try {
    const device = await BlockedDevice.create({
      reportedBy: req.user._id,
      lostItem:   lostItemId || undefined,
      deviceType, brand, model, imeiNumber, serialNumber, reason,
    });
    res.status(201).json({ success: true, message: 'Device blocked!', device });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'This IMEI is already in the blocked list.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/devices/check/:imei  — public check
router.get('/check/:imei', async (req, res) => {
  try {
    const device = await BlockedDevice.findOne({ imeiNumber: req.params.imei })
      .populate('reportedBy', 'name rollNumber');

    if (!device)
      return res.json({ success: true, blocked: false, message: 'IMEI not found in blocked list. Device appears clean.' });

    res.json({
      success: true,
      blocked: true,
      status:  device.status,
      message: `This device is ${device.status}.`,
      device: {
        brand:      device.brand,
        model:      device.model,
        deviceType: device.deviceType,
        status:     device.status,
        reportedBy: device.reportedBy?.name,
        reportedOn: device.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/devices  — public list of all blocked devices
router.get('/', async (req, res) => {
  try {
    const devices = await BlockedDevice.find({ status: 'blocked' })
      .populate('reportedBy', 'name rollNumber')
      .sort({ createdAt: -1 })
      .select('-serialNumber'); // don't expose full serial publicly
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/devices/my
router.get('/my', auth, async (req, res) => {
  try {
    const devices = await BlockedDevice.find({ reportedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/devices/:id/recover
router.patch('/:id/recover', auth, async (req, res) => {
  try {
    const device = await BlockedDevice.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Not found.' });
    if (String(device.reportedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    device.status = 'recovered';
    await device.save();
    res.json({ success: true, message: 'Marked as recovered.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
