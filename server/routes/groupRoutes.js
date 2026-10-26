const express = require('express');
const router = express.Router();
const {
  createGroup,
  createGroupValidation,
  getGroups,
  getGroup,
  addMember,
  addMemberValidation,
  removeMember,
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/', protect, createGroupValidation, validateRequest, createGroup);

/**
 * @route   GET /api/groups
 * @desc    Get all groups for the authenticated user
 * @access  Private
 */
router.get('/', protect, getGroups);

/**
 * @route   GET /api/groups/:id
 * @desc    Get a single group by ID
 * @access  Private
 */
router.get('/:id', protect, getGroup);

/**
 * @route   POST /api/groups/:id/members
 * @desc    Add a member to a group by email
 * @access  Private
 */
router.post(
  '/:id/members',
  protect,
  addMemberValidation,
  validateRequest,
  addMember
);

/**
 * @route   DELETE /api/groups/:id/members/:userId
 * @desc    Remove a member from a group
 * @access  Private
 */
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;
