import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
const clock = vi.hoisted(() =>
  vi.fn((employees: any[]) => ({ loaded: true, activeCount: employees.length, workingCount: 0, statuses: {} }))
);
vi.mock('./useClockStatuses', () => ({ useClockStatuses: clock }));
vi.mock('./useEmployeeRangeStats', () => ({
  useEmployeeRangeStats: () => ({
    stats: { hoursWorked: '0h 7m', costOfLabor: 2.51 },
    isLoading: false,
    isError: false,
    employeesWithStats: [
      { id: 'active', first_name: 'Test', last_name: 'Manager', status: 'active', rate: 20, total_hours: 452 / 3600 },
      { id: 'inactive', first_name: 'Former', last_name: 'Employee', status: 'inactive' }
    ]
  })
}));
import { EmployeesSection } from './EmployeeSection';
it('uses the same active roster for clock counts and rows without invented availability', () => {
  const html = renderToStaticMarkup(
    <EmployeesSection window={{ startDate: '2026-08-30', endDate: '2026-09-28' }} windowLabel="Selected period" />
  );
  expect(clock.mock.calls.at(-1)?.[0].map((e) => e.id)).toEqual(['active']);
  expect(html).toContain('of 1 active employees');
  expect(html).toContain('Test');
  expect(html).not.toContain('Former');
  expect(html).toContain('$2.51');
  expect(html).not.toContain('available');
  expect(html).not.toContain('scheduled labor');
});
