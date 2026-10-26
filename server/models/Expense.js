const mongoose = require('mongoose');

/**
 * Expense schema — stores a single expense within a group.
 * All monetary amounts are stored as integers (cents).
 * Pre-save validation ensures paidBy and splits sums equal the expense amount.
 */
const expenseSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1 cent'],
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'housing', 'entertainment', 'utilities', 'shopping', 'health', 'travel', 'education', 'other'],
    default: 'other',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paidBy: {
    type: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'paidBy user is required'],
        },
        amount: {
          type: Number,
          required: [true, 'paidBy amount is required'],
          min: [0, 'paidBy amount cannot be negative'],
        },
      },
    ],
    validate: {
      validator: function (val) {
        return val && val.length >= 1;
      },
      message: 'At least one paidBy entry is required',
    },
  },
  splits: {
    type: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Split user is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Split amount is required'],
          min: [0, 'Split amount cannot be negative'],
        },
      },
    ],
    validate: {
      validator: function (val) {
        return val && val.length >= 1;
      },
      message: 'At least one split entry is required',
    },
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage', 'shares'],
    default: 'equal',
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

expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ createdBy: 1 });

/**
 * Pre-save validation: ensure the sum of paidBy amounts AND the sum of split
 * amounts each equal the total expense amount.
 */
expenseSchema.pre('save', function (next) {
  const paidBySum = this.paidBy.reduce((sum, entry) => sum + entry.amount, 0);
  if (paidBySum !== this.amount) {
    const err = new mongoose.Error.ValidationError(this);
    err.addError('paidBy', new mongoose.Error.ValidatorError({
      message: `Sum of paidBy amounts (${paidBySum}) must equal expense amount (${this.amount})`,
      path: 'paidBy',
      value: paidBySum,
    }));
    return next(err);
  }

  const splitsSum = this.splits.reduce((sum, entry) => sum + entry.amount, 0);
  if (splitsSum !== this.amount) {
    const err = new mongoose.Error.ValidationError(this);
    err.addError('splits', new mongoose.Error.ValidatorError({
      message: `Sum of split amounts (${splitsSum}) must equal expense amount (${this.amount})`,
      path: 'splits',
      value: splitsSum,
    }));
    return next(err);
  }

  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
