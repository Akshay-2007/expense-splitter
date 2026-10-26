const { body } = require('express-validator');
const Group = require('../models/Group');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Validation rules for creating a group.
 */
const createGroupValidation = [
  body('name').notEmpty().withMessage('Group name is required').trim(),
];

/**
 * Validation rules for adding a member by email.
 */
const addMemberValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

/**
 * @desc    Create a new group
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const group = await Group.create({
      name,
      description: description || '',
      members: [req.user._id],
      createdBy: req.user._id,
    });

    await group.populate('members', 'name email');

    res.status(201).json({
      success: true,
      data: group,
      message: 'Group created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all groups the authenticated user is a member of
 * @route   GET /api/groups
 * @access  Private
 */
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single group by ID
 * @route   GET /api/groups/:id
 * @access  Private
 */
const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'members',
      'name email'
    );

    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    // Check that the requesting user is a member
    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to access this group', 403);
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a member to a group by email
 * @route   POST /api/groups/:id/members
 * @access  Private
 */
const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    // Check that the requesting user is a member
    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to modify this group', 403);
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      throw new ApiError('User not found with that email', 404);
    }

    // Check if already a member
    const alreadyMember = group.members.some(
      (memberId) => memberId.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      throw new ApiError('User is already a member of this group', 409);
    }

    group.members.push(userToAdd._id);
    await group.save();
    await group.populate('members', 'name email');

    res.status(200).json({
      success: true,
      data: group,
      message: 'Member added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a member from a group
 * @route   DELETE /api/groups/:id/members/:userId
 * @access  Private
 */
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    // Check that the requesting user is a member
    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to modify this group', 403);
    }

    // Check that the target user is a member
    const targetIsMember = group.members.some(
      (memberId) => memberId.toString() === req.params.userId
    );
    if (!targetIsMember) {
      throw new ApiError('User is not a member of this group', 404);
    }

    // Cannot remove the group creator
    if (group.createdBy.toString() === req.params.userId) {
      throw new ApiError('Cannot remove the group creator', 400);
    }

    group.members.pull(req.params.userId);
    await group.save();
    await group.populate('members', 'name email');

    res.status(200).json({
      success: true,
      data: group,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  createGroupValidation,
  getGroups,
  getGroup,
  addMember,
  addMemberValidation,
  removeMember,
};
