/**
 * Simplify debts among a group of users using a greedy algorithm.
 * Matches the largest debtor with the largest creditor iteratively to
 * minimise the number of transactions required to settle all balances.
 *
 * @function simplifyDebts
 * @param {Object.<string, number>} balanceMap - Map of userId → net balance in integer cents.
 *   Positive means the user is owed money; negative means the user owes money.
 * @returns {Array<{from: string, to: string, amount: number}>} Simplified transactions (amounts in cents).
 */
const simplifyDebts = (balanceMap) => {
  // Split users into creditors (positive balance) and debtors (negative balance)
  const creditors = []; // { id, amount } — amount > 0
  const debtors = [];   // { id, amount } — amount > 0 (stored as positive for easier math)

  for (const [userId, balance] of Object.entries(balanceMap)) {
    if (balance > 0) {
      creditors.push({ id: userId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id: userId, amount: Math.abs(balance) });
    }
    // Users with zero balance are ignored
  }

  // Sort both descending by amount so we greedily match the largest first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const settleAmount = Math.min(creditors[i].amount, debtors[j].amount);

    if (settleAmount > 0) {
      transactions.push({
        from: debtors[j].id,
        to: creditors[i].id,
        amount: settleAmount,
      });
    }

    creditors[i].amount -= settleAmount;
    debtors[j].amount -= settleAmount;

    if (creditors[i].amount === 0) i++;
    if (debtors[j].amount === 0) j++;
  }

  return transactions;
};

module.exports = simplifyDebts;
