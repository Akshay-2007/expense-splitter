const mongoose = require('mongoose');

/**
 * Settlement schema — represents a payment made from one user to another
 * to settle outstanding debts within a group. Amounts are in integer cents.
 */
const settlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true,
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'From user is required'],
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'To user is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1 cent'],
  },
  date: {
    type: Date,
    default: Date.now,
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

settlementSchema.index({ group: 1, date: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
