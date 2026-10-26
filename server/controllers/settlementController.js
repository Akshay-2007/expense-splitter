const { body } = require('express-validator');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const ApiError = require('../utils/ApiError');

/**
 * Validation rules for creating a settlement.
 */
const createSettlementValidation = [
  body('to').isMongoId().withMessage('Valid recipient user ID is required'),
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer (cents)'),
];

/**
 * @desc    Create a new settlement in a group
 * @route   POST /api/groups/:groupId/settlements
 * @access  Private
 */
const createSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { to, amount } = req.body;

    // Find group and verify membership
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to create settlements in this group', 403);
    }

    // Check 'to' user is a group member
    const toIsMember = group.members.some(
      (memberId) => memberId.toString() === to
    );
    if (!toIsMember) {
      throw new ApiError('Recipient is not a member of this group', 400);
    }

    // Create settlement
    const settlement = await Settlement.create({
      group: groupId,
      from: req.user._id,
      to,
      amount,
      createdBy: req.user._id,
    });

    await settlement.populate('from', 'name email');
    await settlement.populate('to', 'name email');

    res.status(201).json({
      success: true,
      data: settlement,
      message: 'Settlement created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all settlements for a group
 * @route   GET /api/groups/:groupId/settlements
 * @access  Private
 */
const getSettlements = async (req, res, next) => {
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
      throw new ApiError('Not authorized to view settlements for this group', 403);
    }

    const settlements = await Settlement.find({ group: groupId })
      .populate('from', 'name email')
      .populate('to', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSettlement,
  createSettlementValidation,
  getSettlements,
};
