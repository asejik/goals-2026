/**
 * Returns the current date in YYYY-MM-DD format based on the user's LOCAL browser time.
 * We do not use new Date().toISOString() because that converts to UTC.
 */
export const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  // Month is 0-indexed, so we add 1. PadStart ensures "05" instead of "5".
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Formats a YYYY-MM-DD string into something readable like "Fri, Dec 25"
 */
export const formatDateReadable = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
};