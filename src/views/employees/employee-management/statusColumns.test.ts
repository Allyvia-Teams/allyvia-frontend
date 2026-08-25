import { describe, expect, it } from 'vitest';

import { STATUS_COLUMNS } from './statusColumns';
import type { Employee } from 'types/employee';

/**
 * Build an employee whose EMPLOYMENT status and USER ACCOUNT status disagree.
 * The two are independent on the backend: `status` is a column on Employee,
 * while `user_account_status` is derived from the linked Django User
 * (see app/employee/serializers.py::get_user_account_status). A directory that
 * conflates them reports the wrong thing for every employee whose login state
 * differs from their employment state.
 */
const employee = (over: Partial<Employee> = {}): Employee =>
  ({
    id: 'e1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    full_name: 'Ada Lovelace',
    email: 'ada@example.com',
    status: 'active',
    is_active: true,
    user_account_status: 'password_changed',
    ...over
  }) as Employee;

const column = (label: string) => {
  const found = STATUS_COLUMNS.find((c) => c.label === label);
  if (!found) throw new Error(`No column labelled "${label}". Labels: ${STATUS_COLUMNS.map((c) => c.label).join(', ')}`);
  return found;
};

describe('STATUS_COLUMNS — each header is bound to the field it names', () => {
  it('shows "Inactive" under Status once an employee is deactivated', () => {
    // THE BUG (regression in 0bcb985): the Status column rendered
    // user_account_status, so deactivating an employee changed nothing here.
    const deactivated = employee({ status: 'inactive', is_active: false, user_account_status: 'password_changed' });

    expect(column('Status').chip(deactivated).label).toBe('Inactive');
  });

  it('keeps Status on employment state even when the login is still active', () => {
    const deactivated = employee({ status: 'inactive', is_active: false, user_account_status: 'password_changed' });

    // 'password_changed' renders as "Active" in account terms — reading the
    // wrong field would surface exactly that word here.
    expect(column('Status').chip(deactivated).label).not.toBe('Active');
  });

  it('shows "Active" under Status for an employee who has no login at all', () => {
    // Employment does not require a user account; 'no_account' must not leak in.
    const noLogin = employee({ status: 'active', user_account_status: 'no_account' });

    expect(column('Status').chip(noLogin).label).toBe('Active');
  });

  it('keeps Account Status on the login, untouched by deactivating employment', () => {
    const deactivated = employee({ status: 'inactive', is_active: false, user_account_status: 'email_sent' });

    expect(column('Account Status').chip(deactivated).label).toBe('Email Sent');
  });

  it('falls back to "No Account" when the account status is absent', () => {
    const unknown = employee({ user_account_status: undefined });

    expect(column('Account Status').chip(unknown).label).toBe('No Account');
  });

  it('colours a deactivated employee as a warning, not as a healthy account', () => {
    const deactivated = employee({ status: 'inactive', is_active: false, user_account_status: 'password_changed' });

    expect(column('Status').chip(deactivated).color).toBe('warning');
  });
});
