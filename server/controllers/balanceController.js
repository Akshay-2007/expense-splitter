const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const simplifyDebts = require('../utils/simplifyDebts');

/**
 * @desc    Get balances and simplified debts for a group
 * @route   GET /api/groups/:id/balances
 * @access  Private
 */
const getBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'members',
      'name email'
    );
    if (!group) {
      throw new ApiError('Group not found', 404);
    }

    // Check membership
    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      throw new ApiError('Not authorized to view balances for this group', 403);
    }

    // Fetch all expenses and settlements for this group
    const expenses = await Expense.find({ group: req.params.id });
    const settlements = await Settlement.find({ group: req.params.id });

    // Build balance map: { userId: netBalanceCents }
    // Positive = owed money (creditor), Negative = owes money (debtor)
    const balanceMap = {};

    // Initialize all members with zero balance
    for (const member of group.members) {
      balanceMap[member._id.toString()] = 0;
    }

    // Process expenses
    for (const expense of expenses) {
      // Users who paid: they are owed money → add paidBy amounts
      for (const payer of expense.paidBy) {
        const userId = payer.user.toString();
        if (balanceMap[userId] === undefined) balanceMap[userId] = 0;
        balanceMap[userId] += payer.amount;
      }

      // Users who owe: their share is subtracted
      for (const split of expense.splits) {
        const userId = split.user.toString();
        if (balanceMap[userId] === undefined) balanceMap[userId] = 0;
        balanceMap[userId] -= split.amount;
      }
    }

    // Process settlements
    // A settlement from A → B means A pays B cash to settle up.
    // This increases A's "paid" balance and decreases B's "owed" balance.
    for (const settlement of settlements) {
      const fromId = settlement.from.toString();
      const toId = settlement.to.toString();

      // The sender paid money → their net balance goes up
      if (balanceMap[fromId] === undefined) balanceMap[fromId] = 0;
      balanceMap[fromId] += settlement.amount;

      // The receiver received money → their net balance goes down
      if (balanceMap[toId] === undefined) balanceMap[toId] = 0;
      balanceMap[toId] -= settlement.amount;
    }

    // Simplify debts
    const simplifiedDebts = simplifyDebts(balanceMap);

    // Build user-friendly balances array
    const balances = [];
    for (const member of group.members) {
      balances.push({
        user: {
          _id: member._id,
          name: member.name,
          email: member.email,
        },
        amount: balanceMap[member._id.toString()] || 0,
      });
    }

    // Populate user info in simplified debts
    const userMap = {};
    for (const member of group.members) {
      userMap[member._id.toString()] = {
        _id: member._id,
        name: member.name,
        email: member.email,
      };
    }

    // If any user in simplifiedDebts is not in the member list, fetch them
    const missingUserIds = [];
    for (const debt of simplifiedDebts) {
      if (!userMap[debt.from]) missingUserIds.push(debt.from);
      if (!userMap[debt.to]) missingUserIds.push(debt.to);
    }

    if (missingUserIds.length > 0) {
      const missingUsers = await User.find({ _id: { $in: missingUserIds } }).select('name email');
      for (const user of missingUsers) {
        userMap[user._id.toString()] = {
          _id: user._id,
          name: user.name,
          email: user.email,
        };
      }
    }

    const populatedDebts = simplifiedDebts.map((debt) => ({
      from: userMap[debt.from] || { _id: debt.from },
      to: userMap[debt.to] || { _id: debt.to },
      amount: debt.amount,
    }));

    res.status(200).json({
      success: true,
      data: {
        balances,
        simplifiedDebts: populatedDebts,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBalances,
};
