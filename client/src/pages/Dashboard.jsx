import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { groupAPI, balanceAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import GroupCard from '../components/GroupCard';
import Modal from '../components/Modal';
import Loader from '../components/Loader';

/**
 * Dashboard — main landing page after login.
 * Shows summary cards (total owed, total owed to you, group count),
 * a grid of GroupCards, and a "Create Group" modal.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Balance totals across all groups
  const [totalOwe, setTotalOwe] = useState(0);       // sum of negative balances (absolute)
  const [totalOwed, setTotalOwed] = useState(0);      // sum of positive balances

  // Create-group modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  /**
   * Fetch all groups and then fetch balances for each to compute summary totals.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await groupAPI.getAll();
      // Backend: { success, data: [...groups] }
      const allGroups = res.data.data || res.data || [];
      setGroups(allGroups);

      // Fetch balances for each group in parallel
      let owe = 0;
      let owed = 0;

      const balancePromises = allGroups.map(async (g) => {
        try {
          const bRes = await balanceAPI.get(g._id);
          // Backend: { success, data: { balances: [...], simplifiedDebts: [...] } }
          const balanceData = bRes.data.data || bRes.data;
          const balances = balanceData.balances || balanceData || [];
          // Find the current user's balance in this group
          const myBalance = balances.find((b) => {
            const uid = b.user?._id || b.user;
            return uid === user?._id;
          });
          if (myBalance) {
            if (myBalance.amount < 0) owe += Math.abs(myBalance.amount);
            else if (myBalance.amount > 0) owed += myBalance.amount;
          }
        } catch {
          // Silently skip balance errors for individual groups
        }
      });

      await Promise.all(balancePromises);
      setTotalOwe(owe);
      setTotalOwed(owed);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handle create-group form submission.
   */
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      await groupAPI.create({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
      });
      // Refresh the group list
      await fetchData();
      // Reset & close modal
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to create group.'
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <Loader text="Loading your dashboard…" />;
  }

  return (
    <div className="space-y-8">
      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total You Owe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total You Owe</p>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalOwe)}
          </p>
        </div>

        {/* Total Owed to You */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Owed to You</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalOwed)}
          </p>
        </div>

        {/* Groups Count */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Groups</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {groups.length}
          </p>
        </div>
      </div>

      {/* ── Header row with Create button ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Groups</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Group
        </button>
      </div>

      {/* ── Error state ───────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Groups grid or empty state ────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No groups yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create one to start splitting expenses!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {/* ── Create Group Modal ────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError('');
        }}
        title="Create New Group"
      >
        {createError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {createError}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
              placeholder="e.g., Trip to Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors resize-none"
              placeholder="What's this group for?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreateError('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {creating && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
