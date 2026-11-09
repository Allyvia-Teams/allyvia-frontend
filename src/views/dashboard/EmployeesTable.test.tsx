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

  it('formats a stored dashed phone number once, not as 812--55-5-01', () => {
    const employees = [
      {
        id: 'a',
        first_name: 'Hannah',
        last_name: 'Brightwell',
        status: 'active',
        title: 'Sales Associate',
        phone: '812-555-0185',
        email: '',
        rate: 15,
        total_hours: 50 / 3600,
        total_spend: 0.21
      }
    ] as EmployeeListItem[];
    const html = renderToStaticMarkup(<EmployeesTable employees={employees} statuses={{ a: 'off' }} />);
    expect(html).toContain('812-555-0185');
    expect(html).not.toContain('812--55');
    expect(html).toContain('&lt;1m');
    expect(html).toContain('$0.21');
  });
});
