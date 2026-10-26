const express = require('express');
const router = express.Router();
const {
  createExpense,
  expenseValidation,
  getExpenses,
  updateExpense,
  updateExpenseValidation,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

/**
 * @route   POST /api/groups/:groupId/expenses
 * @desc    Create a new expense in a group
 * @access  Private
 */
router.post(
  '/groups/:groupId/expenses',
  protect,
  expenseValidation,
  validateRequest,
  createExpense
);

/**
 * @route   GET /api/groups/:groupId/expenses
 * @desc    Get all expenses for a group
 * @access  Private
 */
router.get('/groups/:groupId/expenses', protect, getExpenses);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update an expense
 * @access  Private
 */
router.put(
  '/expenses/:id',
  protect,
  updateExpenseValidation,
  validateRequest,
  updateExpense
);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete an expense
 * @access  Private
 */
router.delete('/expenses/:id', protect, deleteExpense);

module.exports = router;
