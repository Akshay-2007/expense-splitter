import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupAPI, expenseAPI, balanceAPI, settlementAPI } from '../services/api';
import { formatCurrency, centsToDecimal, decimalToCents } from '../utils/formatCurrency';
import ExpenseItem from '../components/ExpenseItem';
import BalanceCard from '../components/BalanceCard';
import Modal from '../components/Modal';
import Loader from '../components/Loader';

// ─── Available expense categories ────────────────────────────────────────────
const CATEGORIES = [
  'food', 'transport', 'housing', 'entertainment', 'utilities',
  'shopping', 'health', 'travel', 'education', 'other',
];

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS = ['Expenses', 'Balances', 'Settle Up', 'Members', 'Activity'];

/* ═══════════════════════════════════════════════════════════════════════════════
 * GroupPage — the most complex page.
 * Displays group details with 5 tabs: Expenses, Balances, Settle Up, Members,
 * and Activity.
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function GroupPage() {
  const { id: groupId } = useParams();
  const { user } = useAuth();

  // ── Core state ──
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('Expenses');
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // ── Expenses tab state ──
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // ── Balances tab state ──
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // ── Settlements tab state ──
  const [settlements, setSettlements] = useState([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // ── Members tab state ──
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');

  // ── Derived: group members list ──
  // Backend populates members as [{_id, name, email}] directly
  const members = useMemo(() => {
    if (!group) return [];
    return group.members || [];
  }, [group]);

  // ── Derived: group creator ID ──
  const creatorId = useMemo(() => {
    if (!group) return null;
    return group.createdBy?._id || group.createdBy;
  }, [group]);

  /* ─── Fetch group details ──────────────────────────────────────────────── */
  const fetchGroup = useCallback(async () => {
    try {
      const res = await groupAPI.getById(groupId);
      // Backend: { success, data: { _id, name, ... } }
      setGroup(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch group:', err);
      setPageError('Failed to load group details.');
    }
  }, [groupId]);

  /* ─── Fetch expenses (with optional filters) ──────────────────────────── */
  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const res = await expenseAPI.getAll(groupId, params);
      // Backend: { success, data: [...expenses] }
      setExpenses(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setExpensesLoading(false);
    }
  }, [groupId, categoryFilter, dateFrom, dateTo]);

  /* ─── Fetch balances ───────────────────────────────────────────────────── */
  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await balanceAPI.get(groupId);
      // Backend: { success, data: { balances: [...], simplifiedDebts: [...] } }
      const balanceData = res.data.data || res.data;
      setBalances(balanceData.balances || balanceData || []);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setBalancesLoading(false);
    }
  }, [groupId]);

  /* ─── Fetch settlements ────────────────────────────────────────────────── */
  const fetchSettlements = useCallback(async () => {
    setSettlementsLoading(true);
    try {
      const res = await settlementAPI.getAll(groupId);
      // Backend: { success, data: [...settlements] }
      setSettlements(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
    } finally {
      setSettlementsLoading(false);
    }
  }, [groupId]);

  /* ─── Initial load ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      await fetchGroup();
      setPageLoading(false);
    };
    init();
  }, [fetchGroup]);

  /* ─── Reload tab data when switching tabs or filters change ────────────── */
  useEffect(() => {
    if (!group) return;
    if (activeTab === 'Expenses') fetchExpenses();
    else if (activeTab === 'Balances') fetchBalances();
    else if (activeTab === 'Settle Up') fetchSettlements();
  }, [activeTab, group, fetchExpenses, fetchBalances, fetchSettlements]);

  /* ─── Delete expense ───────────────────────────────────────────────────── */
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expenseAPI.delete(expenseId);
      await fetchExpenses();
      await fetchBalances();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense.');
    }
  };

  /* ─── Edit expense ─────────────────────────────────────────────────────── */
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  /* ─── Export CSV ────────────────────────────────────────────────────────── */
  const handleExportCSV = () => {
    const header = ['Description', 'Amount', 'Category', 'Date', 'Paid By'];
    const rows = expenses.map((e) => {
      const paidByNames = (e.paidBy || [])
        .map((p) => (p.user?.name || p.user?.email || 'Unknown'))
        .join('; ');
      return [
        `"${e.description}"`,
        centsToDecimal(e.amount).toFixed(2),
        e.category || 'other',
        new Date(e.date || e.createdAt).toLocaleDateString(),
        `"${paidByNames}"`,
      ];
    });
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${group?.name || 'group'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Add member ───────────────────────────────────────────────────────── */
  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setMemberLoading(true);
    try {
      await groupAPI.addMember(groupId, addMemberEmail.trim());
      setAddMemberEmail('');
      await fetchGroup();
    } catch (err) {
      setMemberError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to add member.'
      );
    } finally {
      setMemberLoading(false);
    }
  };

  /* ─── Remove member ────────────────────────────────────────────────────── */
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      await groupAPI.removeMember(groupId, userId);
      await fetchGroup();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  /* ─── Simplified debts calculation ─────────────────────────────────────── */
  const simplifiedDebts = useMemo(() => {
    // Clone balances into a working array of { user, amount }
    const bals = balances
      .map((b) => ({
        user: b.user || {},
        amount: b.amount || 0,
      }))
      .filter((b) => b.amount !== 0);

    const debts = [];
    // Greedy approach: match biggest creditor with biggest debtor
    const debtors = bals.filter((b) => b.amount < 0).map((b) => ({ ...b, amount: Math.abs(b.amount) }));
    const creditors = bals.filter((b) => b.amount > 0).map((b) => ({ ...b }));

    // Sort descending by absolute amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);
      if (transferAmount > 0) {
        debts.push({
          from: debtors[i].user,
          to: creditors[j].user,
          amount: transferAmount,
        });
      }
      debtors[i].amount -= transferAmount;
      creditors[j].amount -= transferAmount;
      if (debtors[i].amount === 0) i++;
      if (creditors[j].amount === 0) j++;
    }

    return debts;
  }, [balances]);

  /* ─── Activity feed (combined expenses + settlements, sorted by date) ── */
  const activityFeed = useMemo(() => {
    const items = [];

    expenses.forEach((e) => {
      items.push({
        type: 'expense',
        id: e._id,
        description: e.description,
        amount: e.amount,
        date: e.date || e.createdAt,
        createdBy: e.createdBy,
        category: e.category,
      });
    });

    settlements.forEach((s) => {
      const fromName = s.paidBy?.name || s.paidBy?.email || s.from?.name || s.from?.email || 'Someone';
      const toName = s.paidTo?.name || s.paidTo?.email || s.to?.name || s.to?.email || 'Someone';
      items.push({
        type: 'settlement',
        id: s._id,
        description: `${fromName} paid ${toName}`,
        amount: s.amount,
        date: s.date || s.createdAt,
        createdBy: s.createdBy || s.paidBy || s.from,
      });
    });

    // Sort newest first
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items;
  }, [expenses, settlements]);

  // ── Loading / error states ──
  if (pageLoading) return <Loader text="Loading group…" />;
  if (pageError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400">{pageError}</p>
      </div>
    );
  }
  if (!group) return null;

  return (
    <div className="space-y-6">
      {/* ── Group header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{group.name}</h1>
        {group.description && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">{group.description}</p>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}

      {/* ========== EXPENSES TAB ========== */}
      {activeTab === 'Expenses' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="To"
            />

            <div className="flex gap-2 sm:ml-auto">
              <button
                onClick={handleExportCSV}
                disabled={expenses.length === 0}
                className="px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40"
              >
                📥 Export CSV
              </button>
              <button
                onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>
          </div>

          {/* Expense list */}
          {expensesLoading ? (
            <Loader text="Loading expenses…" />
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-gray-500 dark:text-gray-400">No expenses yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <ExpenseItem
                  key={exp._id}
                  expense={exp}
                  currentUserId={user?._id}
                  onEdit={handleEditExpense}
                  onDelete={handleDeleteExpense}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== BALANCES TAB ========== */}
      {activeTab === 'Balances' && (
        <div className="space-y-6">
          {balancesLoading ? (
            <Loader text="Loading balances…" />
          ) : (
            <>
              {/* Per-member balances */}
              <div className="space-y-3">
                {balances.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No balance data yet.
                  </p>
                ) : (
                  balances.map((b, idx) => (
                    <BalanceCard key={b.user?._id || idx} balance={b} />
                  ))
                )}
              </div>

              {/* Simplified debts */}
              {simplifiedDebts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Simplified Debts
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Minimum transactions needed to settle up:
                  </p>
                  <div className="space-y-3">
                    {simplifiedDebts.map((debt, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 gap-3"
                      >
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{debt.from.name || debt.from.email}</span>
                          {' '}owes{' '}
                          <span className="font-medium">{debt.to.name || debt.to.email}</span>
                          {' '}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(debt.amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('Settle Up');
                            // Pre-fill settlement could be done here but we keep it simple
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors self-start sm:self-auto"
                        >
                          Settle
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========== SETTLE UP TAB ========== */}
      {activeTab === 'Settle Up' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Settlements
            </h3>
            <button
              onClick={() => setShowSettlementModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Settlement
            </button>
          </div>

          {settlementsLoading ? (
            <Loader text="Loading settlements…" />
          ) : settlements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-gray-500 dark:text-gray-400">No settlements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlements.map((s) => {
                const fromName = s.paidBy?.name || s.paidBy?.email || s.from?.name || s.from?.email || 'Someone';
                const toName = s.paidTo?.name || s.paidTo?.email || s.to?.name || s.to?.email || 'Someone';
                return (
                  <div
                    key={s._id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {fromName} → {toName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(s.date || s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== MEMBERS TAB ========== */}
      {activeTab === 'Members' && (
        <div className="space-y-6">
          {/* Add member form */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="email"
              required
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              placeholder="Add member by email"
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={memberLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {memberLoading ? 'Adding…' : 'Add'}
            </button>
          </form>

          {memberError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {memberError}
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            {members.map((m) => {
              const memberId = m._id || m;
              const isGroupCreator = memberId === creatorId;
              const isCurrentUserCreator = user?._id === creatorId;
              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {(m.name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {m.name || 'Unknown'}
                        {isGroupCreator && (
                          <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                            Creator
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{m.email}</p>
                    </div>
                  </div>

                  {/* Show remove button only if current user is the creator and the member is not the creator */}
                  {isCurrentUserCreator && !isGroupCreator && (
                    <button
                      onClick={() => handleRemoveMember(memberId)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== ACTIVITY TAB ========== */}
      {activeTab === 'Activity' && (
        <div className="space-y-3">
          {(expensesLoading || settlementsLoading) ? (
            <Loader text="Loading activity…" />
          ) : activityFeed.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
            </div>
          ) : (
            activityFeed.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3"
              >
                {/* Type icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.type === 'expense'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                }`}>
                  {item.type === 'expense' ? '🧾' : '🤝'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.description}
                    </span>
                    {item.category && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.type === 'expense' ? 'Expense' : 'Settlement'}
                    {' • '}
                    {new Date(item.date).toLocaleDateString()}
                    {item.createdBy && (
                      <>
                        {' • by '}
                        <span className="font-medium">
                          {item.createdBy.name || item.createdBy.email || ''}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <span className={`text-lg font-bold flex-shrink-0 ${
                  item.type === 'expense'
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT EXPENSE MODAL                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        groupId={groupId}
        members={members}
        currentUserId={user?._id}
        editingExpense={editingExpense}
        onSaved={async () => {
          setShowExpenseModal(false);
          setEditingExpense(null);
          await fetchExpenses();
          await fetchBalances();
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* RECORD SETTLEMENT MODAL                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <RecordSettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        groupId={groupId}
        members={members}
        currentUserId={user?._id}
        onSaved={async () => {
          setShowSettlementModal(false);
          await fetchSettlements();
          await fetchBalances();
        }}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
 * AddExpenseModal — form for creating or editing an expense.
 * Supports equal, exact, percentage, and shares split types.
 * ═══════════════════════════════════════════════════════════════════════════ */
function AddExpenseModal({ isOpen, onClose, groupId, members, currentUserId, editingExpense, onSaved }) {
  const isEditing = !!editingExpense;

  // ── Form state ──
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');          // dollars as string
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('other');
  const [splitType, setSplitType] = useState('equal');

  // paidBy: array of { userId, amount(dollars string) }
  const [paidBy, setPaidBy] = useState([]);

  // splits: { [userId]: value } — meaning depends on splitType
  const [splits, setSplits] = useState({});

  // equal split: which members are included
  const [equalMembers, setEqualMembers] = useState({});

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Reset / pre-fill form when modal opens ──
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && editingExpense) {
      setDescription(editingExpense.description || '');
      setAmount(centsToDecimal(editingExpense.amount).toFixed(2));
      setDate((editingExpense.date || editingExpense.createdAt || '').split('T')[0] || new Date().toISOString().split('T')[0]);
      setCategory(editingExpense.category || 'other');
      setSplitType(editingExpense.splitType || 'equal');

      // Pre-fill paidBy
      const pb = (editingExpense.paidBy || []).map((p) => ({
        userId: p.user?._id || p.user,
        amount: centsToDecimal(p.amount).toFixed(2),
      }));
      setPaidBy(pb.length > 0 ? pb : [{ userId: currentUserId, amount: centsToDecimal(editingExpense.amount).toFixed(2) }]);

      // Pre-fill splits
      const sp = {};
      const em = {};
      (editingExpense.splits || []).forEach((s) => {
        const uid = s.user?._id || s.user;
        sp[uid] = centsToDecimal(s.amount).toString();
        em[uid] = true;
      });
      setSplits(sp);
      setEqualMembers(Object.keys(em).length > 0 ? em : members.reduce((acc, m) => { acc[m._id] = true; return acc; }, {}));
    } else {
      // New expense — reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('other');
      setSplitType('equal');
      setPaidBy([{ userId: currentUserId, amount: '' }]);
      setSplits({});
      setEqualMembers(members.reduce((acc, m) => { acc[m._id] = true; return acc; }, {}));
    }
    setFormError('');
  }, [isOpen, isEditing, editingExpense, currentUserId, members]);

  // ── Computed: total amount in cents ──
  const totalCents = decimalToCents(parseFloat(amount) || 0);

  // ── Computed: how much each person's share is (for preview) ──
  const computedSplits = useMemo(() => {
    const result = {};
    const includedMembers = members.filter((m) => equalMembers[m._id]);

    if (splitType === 'equal') {
      const count = includedMembers.length || 1;
      const perPerson = Math.floor(totalCents / count);
      const remainder = totalCents - perPerson * count;
      includedMembers.forEach((m, idx) => {
        result[m._id] = perPerson + (idx < remainder ? 1 : 0);
      });
    } else if (splitType === 'exact') {
      members.forEach((m) => {
        result[m._id] = decimalToCents(parseFloat(splits[m._id]) || 0);
      });
    } else if (splitType === 'percentage') {
      members.forEach((m) => {
        const pct = parseFloat(splits[m._id]) || 0;
        result[m._id] = Math.round(totalCents * pct / 100);
      });
    } else if (splitType === 'shares') {
      const totalShares = members.reduce((sum, m) => sum + (parseFloat(splits[m._id]) || 0), 0);
      members.forEach((m) => {
        const share = parseFloat(splits[m._id]) || 0;
        result[m._id] = totalShares > 0 ? Math.round(totalCents * share / totalShares) : 0;
      });
    }

    return result;
  }, [splitType, totalCents, members, splits, equalMembers]);

  // ── Sum of computed splits for validation ──
  const splitTotal = Object.values(computedSplits).reduce((s, v) => s + v, 0);

  // ── Handlers for paidBy ──
  const updatePayer = (index, field, value) => {
    setPaidBy((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const addPayer = () => {
    setPaidBy((prev) => [...prev, { userId: '', amount: '' }]);
  };
  const removePayer = (index) => {
    setPaidBy((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Handler for split values ──
  const updateSplit = (userId, value) => {
    setSplits((prev) => ({ ...prev, [userId]: value }));
  };

  // ── Toggle equal-split member ──
  const toggleEqualMember = (userId) => {
    setEqualMembers((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate amount
    const amountDollars = parseFloat(amount);
    if (!amountDollars || amountDollars <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }

    // Validate paidBy
    const paidByData = paidBy
      .filter((p) => p.userId)
      .map((p) => ({
        user: p.userId,
        amount: decimalToCents(parseFloat(p.amount) || 0),
      }));

    if (paidByData.length === 0) {
      setFormError('Please specify who paid.');
      return;
    }

    // If single payer and amount is blank, auto-fill with total
    if (paidByData.length === 1 && paidByData[0].amount === 0) {
      paidByData[0].amount = totalCents;
    }

    // Validate splits total
    if (splitType !== 'equal' && Math.abs(splitTotal - totalCents) > 1) {
      setFormError(`Split amounts (${formatCurrency(splitTotal)}) don't match total (${formatCurrency(totalCents)}).`);
      return;
    }

    // Build splits array
    const splitsData = members
      .filter((m) => computedSplits[m._id] > 0)
      .map((m) => ({
        user: m._id,
        amount: computedSplits[m._id],
      }));

    const payload = {
      description: description.trim(),
      amount: totalCents,
      date,
      category,
      splitType,
      paidBy: paidByData,
      splits: splitsData,
    };

    setSaving(true);
    try {
      if (isEditing) {
        await expenseAPI.update(editingExpense._id, payload);
      } else {
        await expenseAPI.create(groupId, payload);
      }
      onSaved();
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to save expense.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Expense' : 'Add Expense'}
      size="lg"
    >
      {formError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Description & Amount ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Dinner at restaurant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* ── Date & Category ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Paid By ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paid by
          </label>
          <div className="space-y-2">
            {paidBy.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={p.userId}
                  onChange={(e) => updatePayer(idx, 'userId', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select payer</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>{m.name || m.email}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.amount}
                  onChange={(e) => updatePayer(idx, 'amount', e.target.value)}
                  className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Amount"
                />
                {paidBy.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePayer(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPayer}
            className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add another payer
          </button>
        </div>

        {/* ── Split Type Selector ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Split type
          </label>
          <div className="flex flex-wrap gap-2">
            {['equal', 'exact', 'percentage', 'shares'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  splitType === type
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Split Among ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Split among
          </label>

          {/* EQUAL split — checkboxes */}
          {splitType === 'equal' && (
            <div className="space-y-2">
              {members.map((m) => (
                <label
                  key={m._id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!equalMembers[m._id]}
                      onChange={() => toggleEqualMember(m._id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {m.name || m.email}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {formatCurrency(computedSplits[m._id] || 0)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* EXACT split — dollar inputs */}
          {splitType === 'exact' && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {m.name || m.email}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={splits[m._id] || ''}
                      onChange={(e) => updateSplit(m._id, e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PERCENTAGE split */}
          {splitType === 'percentage' && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {m.name || m.email}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={splits[m._id] || ''}
                      onChange={(e) => updateSplit(m._id, e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-400">%</span>
                    <span className="ml-2 text-xs text-gray-400 w-20 text-right">
                      {formatCurrency(computedSplits[m._id] || 0)}
                    </span>
                  </div>
                </div>
              ))}
              <p className={`text-xs mt-1 ${
                Math.abs(members.reduce((s, m) => s + (parseFloat(splits[m._id]) || 0), 0) - 100) < 0.01
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                Total: {members.reduce((s, m) => s + (parseFloat(splits[m._id]) || 0), 0).toFixed(1)}%
                {Math.abs(members.reduce((s, m) => s + (parseFloat(splits[m._id]) || 0), 0) - 100) >= 0.01 && ' (must be 100%)'}
              </p>
            </div>
          )}

          {/* SHARES split */}
          {splitType === 'shares' && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {m.name || m.email}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={splits[m._id] || ''}
                      onChange={(e) => updateSplit(m._id, e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-400">shares</span>
                    <span className="ml-2 text-xs text-gray-400 w-20 text-right">
                      {formatCurrency(computedSplits[m._id] || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Live preview ── */}
        {totalCents > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {members
                .filter((m) => (computedSplits[m._id] || 0) > 0)
                .map((m) => (
                  <div key={m._id} className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span className="truncate mr-2">{m.name || m.email}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(computedSplits[m._id])}
                    </span>
                  </div>
                ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Split total</span>
              <span className={`font-medium ${
                Math.abs(splitTotal - totalCents) <= 1
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(splitTotal)} / {formatCurrency(totalCents)}
              </span>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? 'Saving…' : isEditing ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
 * RecordSettlementModal — form for recording a settlement between two members.
 * ═══════════════════════════════════════════════════════════════════════════ */
function RecordSettlementModal({ isOpen, onClose, groupId, members, currentUserId, onSaved }) {
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setToUserId('');
      setAmount('');
      setFormError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const amountDollars = parseFloat(amount);
    if (!amountDollars || amountDollars <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!toUserId) {
      setFormError('Please select who you are paying.');
      return;
    }

    setSaving(true);
    try {
      await settlementAPI.create(groupId, {
        to: toUserId,
        amount: decimalToCents(amountDollars),
      });
      onSaved();
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to record settlement.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Settlement" size="sm">
      {formError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pay to
          </label>
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select member</option>
            {members
              .filter((m) => m._id !== currentUserId)
              .map((m) => (
                <option key={m._id} value={m._id}>{m.name || m.email}</option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? 'Recording…' : 'Record Settlement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
