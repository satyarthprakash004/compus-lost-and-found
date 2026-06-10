const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const QrTag = require('../models/QrTag');
const auth = require('../middleware/auth');
const { sendNotification } = require('../config/notifier');

// Helper to generate a unique 8-character code
function generateUniqueCode() {
  return crypto.randomBytes(4).toString('hex'); // 8 characters
}

// POST /api/qr — Create a new QR sticker
router.post('/', auth, async (req, res) => {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ success: false, message: 'Label is required.' });
  }

  try {
    const code = generateUniqueCode();
    const tag = await QrTag.create({
      owner: req.user._id,
      label: label.trim(),
      uniqueCode: code
    });

    // Generate base64 QR Code
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const scanUrl = `${baseUrl}/scan.html?code=${code}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl);

    res.status(201).json({
      success: true,
      message: 'QR Tag generated successfully!',
      tag: {
        _id: tag._id,
        label: tag.label,
        uniqueCode: tag.uniqueCode,
        qrDataUrl
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error generating QR code.' });
  }
});

// GET /api/qr/my — Get all QR codes for logged in user
router.get('/my', auth, async (req, res) => {
  try {
    const tags = await QrTag.find({ owner: req.user._id }).sort({ createdAt: -1 });
    
    // Generate QR Data URLs dynamically so we don't store them in MongoDB
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const tagsWithQr = await Promise.all(
      tags.map(async (tag) => {
        const scanUrl = `${baseUrl}/scan.html?code=${tag.uniqueCode}`;
        const qrDataUrl = await QRCode.toDataURL(scanUrl);
        return {
          _id: tag._id,
          label: tag.label,
          uniqueCode: tag.uniqueCode,
          createdAt: tag.createdAt,
          qrDataUrl
        };
      })
    );

    res.json({ success: true, tags: tagsWithQr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/qr/scan/:code — Public view for scanned tag
router.get('/scan/:code', async (req, res) => {
  try {
    const tag = await QrTag.findOne({ uniqueCode: req.params.code }).populate('owner', 'name');
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Invalid or expired QR Tag.' });
    }

    res.json({
      success: true,
      label: tag.label,
      ownerName: tag.owner.name
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/qr/scan/:code/message — Send an anonymous message to owner
router.post('/scan/:code/message', async (req, res) => {
  const { message, contactInfo } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  try {
    const tag = await QrTag.findOne({ uniqueCode: req.params.code }).populate('owner');
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found.' });
    }

    const owner = tag.owner;
    
    // Construct alert message
    const alertMsg = `📢 FoundIt Alert! Someone scanned your sticker "${tag.label}".\n\nMessage: "${message}"\nFinder Contact: ${contactInfo || 'None provided'}`;
    
    // Send Notification to Owner
    if (owner.email) {
      await sendNotification(
        owner.email,
        `📢 FoundIt Alert! Someone scanned your sticker "${tag.label}"`,
        alertMsg
      );
    }

    res.json({ success: true, message: 'Message sent successfully! The owner has been notified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
