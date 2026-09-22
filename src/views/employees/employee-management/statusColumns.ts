// views/employees/employee-management/statusColumns.ts
//
// The directory shows two different "statuses" and they are NOT the same thing:
//
//   status              — employment. A column on Employee ('active' | 'inactive'),
//                         set by an admin in the edit modal.
//   user_account_status — the login. Derived on the backend from the linked
//                         Django User (is_active / email_verified /
//                         must_change_password) — see
//                         app/employee/serializers.py::get_user_account_status.
//
// They drift apart constantly: an employee with no login reads 'no_account'
// while being perfectly active, and deactivating an employee leaves their User
// untouched, so the login still reads 'password_changed' ("Active").
//
// This module exists because they were once rendered as two adjacent columns
// with the header text 20 lines away from the cell that filled it. Commit
// 0bcb985 collapsed the pair and removed mismatched halves — the "Account
// Status" HEADER and the employment-status CELL — leaving a column headed
// "Status" that rendered the login. Deactivating an employee then appeared to
// do nothing.
//
// Binding each label to its own accessor here keeps that failure impossible:
// the header and its data are one object, so a column cannot lose half of
// itself and still render.
import { getAccountStatusColor, getAccountStatusDisplayText, getStatusColor, getStatusDisplayText } from 'utils/employeeUtils';
import { Employee } from 'types/employee';

export type StatusChip = {
  label: string;
  color: 'success' | 'error' | 'warning' | 'default';
};

export type StatusColumn = {
  key: string;
  label: string;
  chip: (employee: Employee) => StatusChip;
};

export const STATUS_COLUMNS: StatusColumn[] = [
  {
    key: 'status',
    label: 'Status',
    chip: (employee) => ({
      label: getStatusDisplayText(employee.status),
      color: getStatusColor(employee.status)
    })
  },
  {
    key: 'user_account_status',
    label: 'Account Status',
    chip: (employee) => ({
      label: getAccountStatusDisplayText(employee.user_account_status || 'no_account'),
      color: getAccountStatusColor(employee.user_account_status || 'no_account')
    })
  }
];
