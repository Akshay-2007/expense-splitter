const express = require('express');
const router = express.Router();
const { getBalances } = require('../controllers/balanceController');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/groups/:id/balances
 * @desc    Get balances and simplified debts for a group
 * @access  Private
 */
router.get('/groups/:id/balances', protect, getBalances);

module.exports = router;
