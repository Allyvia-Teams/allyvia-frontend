import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EmployeesTable from './EmployeesTable';
import type { EmployeeListItem } from 'types/employee';

describe('dashboard employee roster', () => {
  it('renders all eleven rows with initials, missing rates and consistent hours', () => {
    const employees = Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      first_name: 'jaylen',
      last_name: 'brooks',
      status: 'active',
      title: '',
      phone: '',
      email: '',
      rate: 0,
      total_hours: i === 0 ? 452 / 3600 : 0,
      total_spend: 0
    })) as EmployeeListItem[];
    const html = renderToStaticMarkup(<EmployeesTable employees={employees} statuses={{}} />);
    expect((html.match(/>JB</g) || []).length).toBe(11);
    expect((html.match(/>Not set</g) || []).length).toBe(11);
    expect(html).toContain('0h 7m');
    expect(html).not.toContain('N/A');
    expect(html).not.toContain('TablePagination');
  });
});
