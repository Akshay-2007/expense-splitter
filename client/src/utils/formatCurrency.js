/**
 * Format an amount stored in cents into a human-readable currency string.
 * @param {number} cents - The amount in cents (e.g., 1050 = $10.50)
 * @param {string} currency - ISO 4217 currency code, defaults to 'USD'
 * @returns {string} Formatted currency string (e.g., "$10.50")
 */
export function formatCurrency(cents, currency = 'USD') {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Convert cents to a decimal dollar value.
 * @param {number} cents
 * @returns {number}
 */
export function centsToDecimal(cents) {
  return cents / 100;
}

/**
 * Convert a decimal dollar value to cents (integer).
 * Uses Math.round to avoid floating-point errors.
 * @param {number} decimal
 * @returns {number}
 */
export function decimalToCents(decimal) {
  return Math.round(decimal * 100);
}
