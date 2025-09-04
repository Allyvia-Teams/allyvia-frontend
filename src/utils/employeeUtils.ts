// Employee Utility Functions
import { Employee, EmployeeStats } from 'types/employee';

// Calculate employee statistics
export const calculateEmployeeStats = (employees: Employee[]): EmployeeStats => {
  const total = employees.length;
  const active = employees.filter((emp) => emp.status === 'active').length;
  const inactive = employees.filter((emp) => emp.status === 'inactive').length;

  // Get unique titles
  const uniqueTitles = new Set(employees.map((emp) => emp.title));

  return {
    totalEmployees: total,
    totalTitles: uniqueTitles.size,
    activeEmployees: active,
    inactiveEmployees: inactive
  };
};

// Get status color for UI display
export const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    default:
      return 'default';
  }
};

// Get status display text
export const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    default:
      return 'Unknown';
  }
};

// Format employee name
export const formatEmployeeName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

// Validate employee email
export const validateEmployeeEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate employee phone
export const validateEmployeePhone = (phone: string): boolean => {
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Alias functions for backward compatibility
export const validatePhone = validateEmployeePhone;
export const validateEmail = validateEmployeeEmail;

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone; // Return original if can't format
};

// Get employee initials
export const getEmployeeInitials = (firstName: string, lastName: string): string => {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
};

// Sort employees by various criteria
export const sortEmployees = (employees: Employee[], sortBy: keyof Employee, sortOrder: 'asc' | 'desc' = 'asc'): Employee[] => {
  return [...employees].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortOrder === 'asc' ? -1 : 1;
    if (bValue === undefined) return sortOrder === 'asc' ? 1 : -1;

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// Filter employees by search term
export const filterEmployees = (employees: Employee[], searchTerm: string): Employee[] => {
  if (!searchTerm.trim()) return employees;

  const term = searchTerm.toLowerCase();
  return employees.filter(
    (emp) =>
      emp.first_name.toLowerCase().includes(term) ||
      emp.last_name.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      (emp.title && emp.title.toLowerCase().includes(term)) ||
      emp.status.toLowerCase().includes(term)
  );
};

// Get employees by status
export const getEmployeesByStatus = (employees: Employee[], status: string): Employee[] => {
  return employees.filter((emp) => emp.status === status);
};

// Get employees by department/title category
export const getEmployeesByTitleCategory = (employees: Employee[], category: string): Employee[] => {
  const categories = {
    engineering: ['software engineer', 'developer', 'engineer', 'programmer', 'devops', 'qa'],
    design: ['designer', 'ux', 'ui', 'graphic', 'visual'],
    management: ['manager', 'director', 'lead', 'head', 'chief', 'vp', 'ceo'],
    sales: ['sales', 'account', 'business development', 'revenue'],
    marketing: ['marketing', 'brand', 'content', 'social media', 'seo'],
    hr: ['hr', 'human resources', 'recruiter', 'talent'],
    finance: ['finance', 'accounting', 'controller', 'cfo', 'bookkeeper'],
    operations: ['operations', 'project', 'product', 'scrum', 'agile']
  };

  const targetCategory = categories[category as keyof typeof categories];
  if (!targetCategory) return employees;

  return employees.filter((emp) => emp.title && targetCategory.some((cat) => emp.title!.toLowerCase().includes(cat)));
};
