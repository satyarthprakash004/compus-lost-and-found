const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema(
  {
    postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category:    {
      type: String,
      required: true,
      enum: ['gadget', 'document', 'clothing', 'bag', 'keys', 'person', 'other'],
    },
    locationLost: { type: String, required: true, trim: true },
    dateLost:     { type: Date, required: true },
    imageUrl:     { type: String },
    contactInfo:  { type: String, trim: true }, // extra contact (optional)
    reward:       { type: String, trim: true },
    latitude:     { type: Number },
    longitude:    { type: Number },
    handoverSpot: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'found', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Text index for search
lostItemSchema.index({ title: 'text', description: 'text', locationLost: 'text' });

module.exports = mongoose.model('LostItem', lostItemSchema);
