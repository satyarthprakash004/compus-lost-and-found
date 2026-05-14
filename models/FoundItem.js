const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema(
  {
    postedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:         { type: String, required: true, trim: true },
    description:   { type: String, trim: true },
    category:      {
      type: String,
      required: true,
      enum: ['gadget', 'document', 'clothing', 'bag', 'keys', 'person', 'other'],
    },
    locationFound: { type: String, required: true, trim: true },
    dateFound:     { type: Date, required: true },
    imageUrl:      { type: String },
    contactInfo:   { type: String, trim: true },
    currentlyAt:   { type: String, trim: true }, // where item is kept now
    status: {
      type: String,
      enum: ['available', 'claimed', 'closed'],
      default: 'available',
    },
  },
  { timestamps: true }
);

foundItemSchema.index({ title: 'text', description: 'text', locationFound: 'text' });

module.exports = mongoose.model('FoundItem', foundItemSchema);
