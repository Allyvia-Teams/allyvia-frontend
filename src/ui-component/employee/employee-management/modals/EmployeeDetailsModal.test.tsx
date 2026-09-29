import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { useEmployeePermissions } from 'hooks/usePermission';

vi.mock('hooks/usePermission', () => ({ useEmployeePermissions: vi.fn() }));
vi.mock('store', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { currentRole: { company_id: 'test' } } }),
  useDispatch: () => vi.fn()
}));
vi.mock('api/employee.api', () => ({ employeeAPI: {} }));
vi.mock('store/slices/employee', () => ({ updateEmployeeInState: vi.fn() }));
vi.mock('@mui/material', async (original) => ({
  ...(await original<typeof import('@mui/material')>()),
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const employee = {
  id: 'employee',
  first_name: 'Test',
  last_name: 'Staff',
  full_name: 'Test Staff',
  email: 'test@example.com',
  rate: 95,
  total_spend: 760,
  status: 'active' as const,
  is_active: true
};
const render = () => renderToStaticMarkup(<EmployeeDetailsModal open employee={employee} onClose={() => {}} onEdit={() => {}} />);

describe('employee detail visibility', () => {
  beforeEach(() => {
    vi.mocked(useEmployeePermissions).mockReturnValue({ roster: true, manage: false, approve: false, delete: false });
  });
  it('hides cached pay and account actions from a roster reader', () => {
    const html = render();
    expect(html).not.toContain('Hourly Rate');
    expect(html).not.toContain('Total Spend');
    expect(html).not.toContain('$95.00');
    expect(html).not.toContain('Create Account &amp; Send Email');
    expect(html).not.toContain('Edit Employee');
  });
  it('allows management to see pay and manage account access', () => {
    vi.mocked(useEmployeePermissions).mockReturnValue({ roster: true, manage: true, approve: false, delete: false });
    const html = render();
    expect(html).toContain('Hourly Rate');
    expect(html).toContain('$95.00');
    expect(html).toContain('Create Account &amp; Send Email');
  });
});
