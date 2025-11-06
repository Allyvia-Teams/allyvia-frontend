// Date utility functions to replace date-fns dependency

export const formatDate = (dateString: string | Date, format: string = 'MMM dd, yyyy') => {
  const date = new Date(dateString);

  switch (format) {
    case 'DD MMM YY': {
      const dd = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const yy = String(date.getFullYear()).slice(-2);
      return `${dd} ${month} ${yy}`;
    }
    case 'MMM dd, yyyy':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'MMM dd':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekDate':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    case 'YYYY-MM-DD': {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    case 'yyyy-MM-dd':
      return date.toISOString().split('T')[0];
    case 'time':
      return date.toLocaleTimeString();
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

export const format = formatDate; // Alias for compatibility with date-fns

// Week helpers
export const getWeekStart = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  return start;
};

export const getWeekDates = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

export const formatWeekDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a date-only string (YYYY-MM-DD) to local format
 * Note: Date-only strings are timezone-agnostic calendar dates
 * @param dateString - Date string in YYYY-MM-DD format
 * @param format - Format string
 * @returns Formatted date string
 */
export const formatDateOnly = (dateString: string, format: string = 'MMM dd'): string => {
  // Parse as local date to avoid timezone issues with date-only strings
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  switch (format) {
    case 'MMM dd':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'MMM dd, yyyy':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'weekDate':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

/**
 * TIMEZONE STRATEGY FOR WEATHER DATA
 *
 * The weather system follows the same timestamp pattern as all backend services:
 *
 * 1. System Metadata (created_at, updated_at) → UTC
 *    - Use formatDate() to convert these to user's local timezone
 *
 * 2. Business Dates (forecast_start_date, forecast_end_date) → Date Only (YYYY-MM-DD)
 *    - Use formatDateOnly() for display
 *    - No timezone conversion needed (calendar dates only)
 *
 * 3. Weather Times (hourly forecast times) → Business-Local Timezone
 *    - Backend provides times like "2:00 PM" already in business location timezone
 *    - Display as-is, no conversion needed
 *    - Example: block.hours = "10 AM - 2 PM" (already local to business)
 *
 * This matches the pattern in Invoice model:
 *    - Invoice.created_at → UTC (use formatDate)
 *    - Invoice.date → DateField (use formatDateOnly)
 *    - Invoice display data → Already formatted
 */
