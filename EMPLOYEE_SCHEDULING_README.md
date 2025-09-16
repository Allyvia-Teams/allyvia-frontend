# Employee Scheduling System - Frontend Implementation

This document describes the frontend implementation of the Employee Scheduling system with shifts CRUD and calendar functionality.

## Overview

The Employee Scheduling system allows administrators and managers to create, read, update, and delete employee shifts, while regular members can only view their own shifts. The system includes a calendar interface with month and list views, employee filtering, and role-based access control.

## Features Implemented

### 1. API Integration (`src/api/employee.api.ts`)
- **Employee Management**: `useGetEmployees()` - Fetch all employees
- **Shift Management**: 
  - `useGetShifts()` - Get shifts with filtering (admin/manager)
  - `useGetMyShifts()` - Get current user's shifts (members)
  - `createShift()` - Create new shift
  - `updateShift()` - Update existing shift
  - `deleteShift()` - Delete shift
- **Cache Management**: `invalidateShiftsCache()` - Refresh data after mutations

### 2. Type Definitions (`src/types/entities.ts`)
- **Employee**: Basic employee information
- **Shift**: Shift data structure with employee association
- **CreateShiftRequest/UpdateShiftRequest**: API request types
- **ShiftFilters/MyShiftsFilters**: Query parameter types

### 3. Calendar Component (`src/views/calendar/index.tsx`)
- **Role-Based Access Control**: 
  - Admins/Managers: Full CRUD access to all shifts
  - Members: Read-only access to their own shifts
- **Calendar Views**:
  - Month view with grid layout
  - List view with detailed shift information
- **Employee Filtering**: Filter shifts by specific employees (admin/manager only)
- **Date Range Filtering**: Automatic date range updates based on view mode
- **Shift Management**:
  - Create new shifts with employee selection
  - Edit existing shifts
  - Delete shifts with confirmation
  - Real-time updates without page reload

### 4. Key Features

#### Role-Based Access Control
```typescript
const canManage = useMemo(() => {
  return user?.role ? canManageShifts(user.role) : false;
}, [user?.role]);
```

#### Employee Color Coding
Each employee gets a consistent color for easy identification:
```typescript
const getEmployeeColor = (employeeId: string, employees: Employee[]): string => {
  const colors = ['#673ab7', '#69A1EA', '#00e676', '#ffab91', '#f44336', '#9c27b0', '#2196f3', '#4caf50'];
  // Consistent color assignment based on employee ID
};
```

#### Real-time Data Updates
- Automatic cache invalidation after mutations
- Optimistic updates for better UX
- Error handling with user feedback

## API Endpoints Used

### Employee Endpoints
- `GET /employee/employees/` - Get all employees
- `GET /employee/shifts/` - Get shifts with filters (admin/manager)
- `GET /employee/my-shifts/` - Get current user's shifts (members)
- `POST /employee/shifts/` - Create new shift
- `PUT /employee/shifts/{id}/` - Update shift
- `DELETE /employee/shifts/{id}/` - Delete shift

### Query Parameters
- `start` - Start date (ISO format)
- `end` - End date (ISO format)
- `employee_id` - Filter by specific employee

## Authentication & Authorization

The system uses the existing JWT authentication with role-based access control:
- **X-Role-ID** header is automatically included in requests
- Role checking is done client-side for UI state management
- Backend enforces actual permissions

## Usage

### For Administrators/Managers
1. Navigate to the Calendar page
2. View all employee shifts in month or list view
3. Click on any day to create a new shift
4. Select employee, set start/end times, add notes
5. Edit existing shifts by clicking on them
6. Delete shifts with confirmation dialog
7. Filter shifts by specific employees using the filter panel

### For Members
1. Navigate to the Calendar page
2. View only your own shifts
3. Read-only access - no create/edit/delete capabilities
4. Same calendar interface but limited to personal shifts

## Error Handling

- Loading states with spinners
- Error messages with dismissible alerts
- Graceful fallbacks for missing data
- Network error handling with retry options

## Testing

A test component is available at `src/views/calendar/EmployeeShiftsTest.tsx` for verifying API integration:
- Tests employee data loading
- Tests shift data loading
- Tests shift creation
- Displays current data for debugging

## Dependencies

- React 18+
- Material-UI (MUI) v5
- SWR for data fetching and caching
- TypeScript for type safety
- Existing authentication system

## File Structure

```
src/
├── api/
│   └── employee.api.ts          # API functions and hooks
├── types/
│   └── entities.ts              # Type definitions
├── views/
│   └── calendar/
│       ├── index.tsx            # Main calendar component
│       └── EmployeeShiftsTest.tsx # Test component
└── hooks/
    └── useAuth.ts               # Authentication hook
```

## Future Enhancements

1. **Week View**: Add week view to calendar
2. **Day View**: Add detailed day view
3. **Bulk Operations**: Select multiple shifts for bulk actions
4. **Shift Templates**: Create reusable shift templates
5. **Notifications**: Real-time notifications for shift changes
6. **Export**: Export shifts to CSV/PDF
7. **Mobile Optimization**: Better mobile responsiveness
8. **Drag & Drop**: Drag shifts between time slots
9. **Recurring Shifts**: Create recurring shift patterns
10. **Shift Conflicts**: Detect and warn about scheduling conflicts

## Troubleshooting

### Common Issues

1. **No shifts showing**: Check if user has proper role and permissions
2. **API errors**: Verify backend endpoints are running and accessible
3. **Authentication issues**: Ensure user is logged in with valid token
4. **Employee filter not working**: Check if employee data is loaded

### Debug Mode

Enable debug logging by adding to console:
```javascript
localStorage.setItem('debug', 'employee-scheduling');
```

## Security Considerations

- All API calls include authentication headers
- Role-based access control on both frontend and backend
- Input validation on all forms
- XSS protection through React's built-in escaping
- CSRF protection through same-origin policy

## Performance Optimizations

- SWR caching reduces unnecessary API calls
- Memoized calculations prevent unnecessary re-renders
- Lazy loading of calendar views
- Optimistic updates for better perceived performance
- Debounced search and filtering
