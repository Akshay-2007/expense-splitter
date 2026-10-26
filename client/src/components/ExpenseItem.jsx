import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

/**
 * Category badge colour mapping.
 */
const categoryColors = {
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  transport: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  housing: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  entertainment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  shopping: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  health: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  travel: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  education: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

/**
 * ExpenseItem — renders a single expense row with amount, category, payer info,
 * and edit/delete actions if the current user is the creator.
 *
 * @param {Object}   expense       - The expense data object.
 * @param {string}   currentUserId - The logged-in user's _id.
 * @param {function} onEdit        - Called with the expense when edit is clicked.
 * @param {function} onDelete      - Called with the expense _id when delete is clicked.
 */
export default function ExpenseItem({ expense, currentUserId, onEdit, onDelete }) {
  // Determine the payer name
  const paidBy = expense.paidBy || [];
  const paidByNames = paidBy
    .map((p) => {
      const u = p.user || p;
      return u.name || u.email || 'Unknown';
    })
    .join(', ');

  // Find the current user's share in the splits
  const splits = expense.splits || [];
  const mySplit = splits.find((s) => {
    const uid = s.user?._id || s.user;
    return uid === currentUserId;
  });

  // Find what I paid
  const myPayment = paidBy.find((p) => {
    const uid = p.user?._id || p.user;
    return uid === currentUserId;
  });

  const myShareCents = mySplit?.amount || 0;
  const myPaidCents = myPayment?.amount || 0;
  const myNet = myPaidCents - myShareCents; // positive = I'm owed, negative = I owe

  // Is the current user the expense creator?
  const creatorId = expense.createdBy?._id || expense.createdBy;
  const isCreator = creatorId === currentUserId;

  // Category badge
  const category = (expense.category || 'other').toLowerCase();
  const badgeClass = categoryColors[category] || categoryColors.other;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left side — description, category, date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {expense.description}
            </h4>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badgeClass}`}>
              {category}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>
              Paid by <span className="font-medium text-gray-700 dark:text-gray-300">{paidByNames || 'Unknown'}</span>
            </span>
            <span>•</span>
            <span>{new Date(expense.date || expense.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Your share vs what you paid */}
          {mySplit && (
            <div className="mt-1 text-sm">
              {myNet > 0 ? (
                <span className="text-green-600 dark:text-green-400">
                  You get back {formatCurrency(myNet)}
                </span>
              ) : myNet < 0 ? (
                <span className="text-red-600 dark:text-red-400">
                  You owe {formatCurrency(Math.abs(myNet))}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">Settled</span>
              )}
            </div>
          )}
        </div>

        {/* Right side — total amount + actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(expense.amount)}
          </span>

          {isCreator && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit && onEdit(expense)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                title="Edit expense"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDelete && onDelete(expense._id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete expense"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
