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
it('asks for repeat suggestions and creates a recurring expense for the bound company', async () => {
  const bound = expenseCatalogueAPI('company-a');
  transport.post.mockResolvedValueOnce({ data: { groups: [{ payee: 'Landlord' }] } });
  expect(await bound.suggestRecurring(['e1', 'e2'])).toEqual([{ payee: 'Landlord' }]);
  expect(transport.post).toHaveBeenLastCalledWith(
    '/expense/catalogue/recurring/suggest/',
    { entry_ids: ['e1', 'e2'] },
    { params: { company_id: 'company-a' } }
  );
  await bound.createRecurring({ request_id: 'r' } as never);
  expect(transport.post).toHaveBeenLastCalledWith(
    '/expense/catalogue/recurring/',
    { request_id: 'r', company_id: 'company-a' },
    { params: { company_id: 'company-a' } }
  );
});
