import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFound — simple 404 page with a link back to the dashboard.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <div className="text-7xl mb-4">🔍</div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
        Page Not Found
      </p>
      <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
