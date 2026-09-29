import { it, expect, vi } from 'vitest';
const transport = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({ data: {} }),
  get: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  patch: vi.fn().mockResolvedValue({ data: {} })
}));
vi.mock('utils/axios', () => ({ default: transport }));
import { expenseCatalogueAPI } from './expenseCatalogue.api';
it('binds mutations to the initiating company even if global role changes', async () => {
  const bound = expenseCatalogueAPI('company-a');
  await bound.import('invoice data');
  expect(transport.post).toHaveBeenLastCalledWith(
    '/expense/catalogue/import/',
    { csv: 'invoice data' },
    { params: { company_id: 'company-a' } }
  );
  await bound.report({ start_date: '2026-09-01', end_date: '2026-09-30' });
  expect(transport.get).toHaveBeenLastCalledWith('/expense/catalogue/summary/', {
    params: { start_date: '2026-09-01', end_date: '2026-09-30', company_id: 'company-a' }
  });
});
