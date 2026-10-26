import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

/**
 * BalanceCard — displays a single member's balance within a group.
 *
 * @param {Object} balance - Object with user info and amount (in cents).
 *   { user: { _id, name, email }, amount: number }
 *
 * Positive amount → the user is owed money (green).
 * Negative amount → the user owes money (red).
 * Zero → settled up (gray).
 */
export default function BalanceCard({ balance }) {
  const user = balance.user || {};
  const name = user.name || user.email || 'Unknown';
  const amount = balance.amount || 0;

  let statusText, statusColor, bgColor, borderColor, icon;

  if (amount > 0) {
    statusText = 'gets back';
    statusColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-50 dark:bg-green-900/20';
    borderColor = 'border-green-200 dark:border-green-800';
    icon = (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  } else if (amount < 0) {
    statusText = 'owes';
    statusColor = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    borderColor = 'border-red-200 dark:border-red-800';
    icon = (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  } else {
    statusText = 'settled up';
    statusColor = 'text-gray-500 dark:text-gray-400';
    bgColor = 'bg-gray-50 dark:bg-gray-800';
    borderColor = 'border-gray-200 dark:border-gray-700';
    icon = (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
          <p className={`text-sm ${statusColor}`}>{statusText}</p>
        </div>
      </div>
      <span className={`text-lg font-bold ${statusColor}`}>
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
