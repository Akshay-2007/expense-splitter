const express = require('express');
const router = express.Router();
const {
  createSettlement,
  createSettlementValidation,
  getSettlements,
} = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

/**
 * @route   POST /api/groups/:groupId/settlements
 * @desc    Create a new settlement in a group
 * @access  Private
 */
router.post(
  '/groups/:groupId/settlements',
  protect,
  createSettlementValidation,
  validateRequest,
  createSettlement
);

/**
 * @route   GET /api/groups/:groupId/settlements
 * @desc    Get all settlements for a group
 * @access  Private
 */
router.get('/groups/:groupId/settlements', protect, getSettlements);

module.exports = router;
