const mongoose = require('mongoose');

/**
 * Group schema — represents a collection of users who share expenses.
 * A group must have at least one member.
 */
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    validate: {
      validator: function (val) {
        return val && val.length >= 1;
      },
      message: 'A group must have at least one member',
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Group', groupSchema);
