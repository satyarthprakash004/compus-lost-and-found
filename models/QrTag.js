const mongoose = require('mongoose');

const qrTagSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QrTag', qrTagSchema);
