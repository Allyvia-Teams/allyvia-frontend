import { describe, expect, it } from 'vitest';
import { employeePermissions } from './employeePermissions';

describe('employee capabilities', () => {
  it('fails closed without a grant', () => {
    expect(employeePermissions('member', {})).toEqual({ roster: false, manage: false, approve: false, delete: false });
  });
  it('keeps approval independent of management', () => {
    expect(employeePermissions('member', { 'employees.approve': true })).toEqual({
      roster: false,
      manage: false,
      approve: true,
      delete: false
    });
  });
  it('allows management without deletion or approval', () => {
    expect(employeePermissions('member', { 'employees.manage': true })).toEqual({
      roster: true,
      manage: true,
      approve: false,
      delete: false
    });
  });
  it('requires management as well as the deletion grant', () => {
    expect(employeePermissions('member', { 'employees.delete': true }).delete).toBe(false);
    expect(employeePermissions('member', { 'employees.manage': true, 'employees.delete': true }).delete).toBe(true);
  });
  it('preserves administrator access', () => {
    expect(employeePermissions('admin', {})).toEqual({ roster: true, manage: true, approve: true, delete: true });
  });
});
