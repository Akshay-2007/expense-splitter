import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Deterministic pastel colour based on a string (user name).
 */
function stringToColor(str) {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * GroupCard — displays a summary of a group in a card layout.
 * @param {Object}  group - Group data object with name, description, members, createdAt.
 */
export default function GroupCard({ group }) {
  const members = group.members || [];
  const maxAvatars = 5;
  const visibleMembers = members.slice(0, maxAvatars);
  const extraCount = members.length - maxAvatars;

  return (
    <Link
      to={`/groups/${group._id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 p-5 group"
    >
      {/* Group name */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
        {group.name}
      </h3>

      {/* Description */}
      {group.description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {group.description}
        </p>
      )}

      {/* Member avatars row */}
      <div className="mt-4 flex items-center gap-1">
        <div className="flex -space-x-2">
          {visibleMembers.map((member, idx) => {
            const memberUser = member.user || member;
            const name = memberUser.name || memberUser.email || '?';
            return (
              <div
                key={memberUser._id || idx}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-gray-800 ${stringToColor(name)}`}
                title={name}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-800">
              +{extraCount}
            </div>
          )}
        </div>
        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Created date */}
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Created {new Date(group.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
