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

// ... keep getTodayString and formatDateReadable ...

/**
 * Returns the date string (YYYY-MM-DD) of the start of the current week (Sunday)
 */
export const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day;
  const start = new Date(date.setDate(diff));
  return start.toISOString().split('T')[0];
};

/**
 * Returns the date string (YYYY-MM-DD) of the start of the current month
 */
export const getStartOfMonth = () => {
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return start.toISOString().split('T')[0];
};