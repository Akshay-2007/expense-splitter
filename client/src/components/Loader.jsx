import React from 'react';

/**
 * Loader — a centered spinner with an optional text label underneath.
 * @param {string} [text] - Optional message to display below the spinner.
 */
export default function Loader({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Spinning circle */}
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      {text && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}
