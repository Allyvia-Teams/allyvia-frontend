// Date utility functions to replace date-fns dependency

export const formatDate = (dateString: string | Date, format: string = 'MMM dd, yyyy') => {
  const date = new Date(dateString);
  
  if (format === 'MMM dd, yyyy') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (format === 'MMM dd') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Default format
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const format = formatDate; // Alias for compatibility with date-fns 