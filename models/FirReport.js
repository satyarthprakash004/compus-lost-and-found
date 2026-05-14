const mongoose = require('mongoose');

const firSchema = new mongoose.Schema(
  {
    reportedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    lostItem:      { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem'  },  // optional link
    description:   { type: String, required: true, trim: true },
    policeStation: { type: String, trim: true },
    firNumber:     { type: String, trim: true },  // filled after visiting station
    status: {
      type: String,
      enum: ['pending', 'filed', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FirReport', firSchema);
