// Date utility functions to replace date-fns dependency

export const formatDate = (dateString: string | Date, format: string = 'MMM dd, yyyy') => {
  const date = new Date(dateString);

  switch (format) {
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
