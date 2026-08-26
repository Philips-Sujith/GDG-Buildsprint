const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [0, 'Total quantity cannot be negative'],
      default: 1,
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative'],
      default: 1,
    },
    shelfLocation: {
      type: String,
      required: [true, 'Shelf location is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup and search performance
bookSchema.index({ subjectCode: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({
  title: 'text',
  author: 'text',
  subjectCode: 'text',
  category: 'text',
});

module.exports = mongoose.model('Book', bookSchema);
