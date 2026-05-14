const mongoose = require('mongoose');

const blockedDeviceSchema = new mongoose.Schema(
  {
    reportedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    lostItem:      { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem'  },
    deviceType:    { type: String, required: true, enum: ['mobile', 'laptop', 'tablet', 'other'] },
    brand:         { type: String, trim: true },
    model:         { type: String, trim: true },
    imeiNumber:    { type: String, trim: true, sparse: true, unique: true }, // unique when present
    serialNumber:  { type: String, trim: true },
    reason:        { type: String, trim: true },
    status: {
      type: String,
      enum: ['blocked', 'recovered', 'cancelled'],
      default: 'blocked',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlockedDevice', blockedDeviceSchema);
