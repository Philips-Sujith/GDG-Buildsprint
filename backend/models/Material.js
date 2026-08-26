const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    uploaderRegNo: {
      type: String,
      required: [true, 'Uploader registration number is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Academic year is required (1-4)'],
      min: [1, 'Year must be between 1 and 4'],
      max: [4, 'Year must be between 1 and 4'],
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL or resource link is required'],
      trim: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and filtering
materialSchema.index({ subjectCode: 1, year: 1 });
materialSchema.index({ uploadDate: -1 });
materialSchema.index({
  title: 'text',
  subjectCode: 'text',
});

module.exports = mongoose.model('Material', materialSchema);
