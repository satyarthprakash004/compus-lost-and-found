const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    lostItem:    { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem',  required: true },
    foundItem:   { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
    message:     { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate match requests for the same pair
matchSchema.index({ lostItem: 1, foundItem: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
