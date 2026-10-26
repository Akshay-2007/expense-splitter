const { body } = require('express-validator');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const ApiError = require('../utils/ApiError');

/**
 * Validation rules for creating/updating an expense.
 */
const expenseValidation = [
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer (cents)'),
  body('splitType')
    .optional()
    .isIn(['equal', 'exact', 'percentage', 'shares'])
    .withMessage('Invalid split type'),
  body('paidBy')
    .isArray({ min: 1 })
    .withMessage('paidBy must be an array with at least one entry'),
  body('splits')
    .optional()
    .isArray()
    .withMessage('splits must be an array'),
];

/**
 * Validation rules for updating an expense (fields optional).
 */
const updateExpenseValidation = [
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .trim(),
  body('amount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer (cents)'),
  body('splitType')
    .optional()
    .isIn(['equal', 'exact', 'percentage', 'shares'])
    .withMessage('Invalid split type'),
  body('paidBy')
    .optional()
    .isArray({ min: 1 })
    .withMessage('paidBy must be an array with at least one entry'),
  body('splits')
    .optional()
    .isArray()
    .withMessage('splits must be an array'),
];

/**
 * @desc    Create a new expense in a group
 * @route   POST /api/groups/:groupId/expenses
 * @access  Private
 */
const createExpense = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { description, amount, currency, category, date, paidBy, splits, splitType } = req.body;

    // Find group and verify membership
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to add expenses to this group', 403);
    }

    // Verify all paidBy users are group members
    const memberIds = group.members.map((m) => m.toString());
    for (const entry of paidBy) {
      if (!memberIds.includes(entry.user.toString())) {
        throw new ApiError(
          `User ${entry.user} in paidBy is not a member of this group`,
          400
        );
      }
    }

    // Calculate splits for 'equal' split type or if splits is empty
    let finalSplits = splits;
    if (splitType === 'equal' || !splits || splits.length === 0) {
      const memberCount = group.members.length;
      const baseAmount = Math.floor(amount / memberCount);
      const remainder = amount % memberCount;

      finalSplits = group.members.map((memberId, index) => ({
        user: memberId,
        amount: baseAmount + (index < remainder ? 1 : 0),
      }));
    } else {
      // Verify all split users are group members
      for (const entry of finalSplits) {
        if (!memberIds.includes(entry.user.toString())) {
          throw new ApiError(
            `User ${entry.user} in splits is not a member of this group`,
            400
          );
        }
      }
    }

    // Validate paidBy sum equals amount
    const paidBySum = paidBy.reduce((sum, entry) => sum + entry.amount, 0);
    if (paidBySum !== amount) {
      throw new ApiError(
        `Sum of paidBy amounts (${paidBySum}) must equal expense amount (${amount})`,
        400
      );
    }

    // Validate splits sum equals amount
    const splitsSum = finalSplits.reduce((sum, entry) => sum + entry.amount, 0);
    if (splitsSum !== amount) {
      throw new ApiError(
        `Sum of split amounts (${splitsSum}) must equal expense amount (${amount})`,
        400
      );
    }

    // Create expense
    const expense = await Expense.create({
      group: groupId,
      description,
      amount,
      currency: currency || 'USD',
      category: category || 'other',
      date: date || Date.now(),
      paidBy,
      splits: finalSplits,
      splitType: splitType || 'equal',
      createdBy: req.user._id,
    });

    await expense.populate('paidBy.user', 'name email');
    await expense.populate('splits.user', 'name email');

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all expenses for a group
 * @route   GET /api/groups/:groupId/expenses
 * @access  Private
 */
const getExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Find group and verify membership
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to view expenses for this group', 403);
    }

    // Build query filter
    const filter = { group: groupId };

    // Optional category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Optional date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.date.$lte = new Date(req.query.endDate);
      }
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy.user', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an expense
 * @route   PUT /api/expenses/:id
 * @access  Private
 */
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new ApiError('Expense not found', 404);
    }

    // Find group and verify membership
    const group = await Group.findById(expense.group);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to update this expense', 403);
    }

    // Merge updates
    const updates = req.body;
    const updatedAmount = updates.amount !== undefined ? updates.amount : expense.amount;
    const updatedPaidBy = updates.paidBy !== undefined ? updates.paidBy : expense.paidBy;
    const updatedSplits = updates.splits !== undefined ? updates.splits : expense.splits;

    // Validate sums if amount, paidBy, or splits changed
    if (updates.amount !== undefined || updates.paidBy !== undefined || updates.splits !== undefined) {
      const paidBySum = updatedPaidBy.reduce((sum, entry) => sum + entry.amount, 0);
      if (paidBySum !== updatedAmount) {
        throw new ApiError(
          `Sum of paidBy amounts (${paidBySum}) must equal expense amount (${updatedAmount})`,
          400
        );
      }

      const splitsSum = updatedSplits.reduce((sum, entry) => sum + entry.amount, 0);
      if (splitsSum !== updatedAmount) {
        throw new ApiError(
          `Sum of split amounts (${splitsSum}) must equal expense amount (${updatedAmount})`,
          400
        );
      }
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      expense[key] = updates[key];
    });

    await expense.save();
    await expense.populate('paidBy.user', 'name email');
    await expense.populate('splits.user', 'name email');

    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new ApiError('Expense not found', 404);
    }

    // Find group and verify membership
    const group = await Group.findById(expense.group);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to delete this expense', 403);
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  expenseValidation,
  getExpenses,
  updateExpense,
  updateExpenseValidation,
  deleteExpense,
};
