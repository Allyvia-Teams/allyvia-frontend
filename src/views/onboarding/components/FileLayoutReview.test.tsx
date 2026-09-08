import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { StagedTableSummary } from 'api/onboarding.api';
import FileLayoutReview from './FileLayoutReview';

vi.mock('../hooks/useOnboardingQueries', () => ({
  useParsePreview: () => ({
    data: {
      rows: [
        { row_number: 1, values: ['Sales report'], selectable: true },
        { row_number: 2, values: [], selectable: false },
        { row_number: 3, values: ['sku', 'name'], selectable: true }
      ],
      limited: false
    },
    isPending: false,
    isError: false
  })
}));

describe('file layout review', () => {
  it('opens the source preview immediately when a header decision is required', () => {
    const table = { id: 't1', header_info: { detected: false } } as StagedTableSummary;
    const html = renderToStaticMarkup(<FileLayoutReview table={table} disabled={false} onApply={vi.fn()} />);
    expect(html).toContain('Source rows for header selection');
    expect(html).toContain('Sales report');
    expect(html).toContain('(blank row)');
    expect(html).toContain('Apply file layout');
  });

  it('keeps optional layout changes collapsed after a confirmed header decision', () => {
    const table = { id: 't1', header_info: { detected: false, forced: true } } as StagedTableSummary;
    const html = renderToStaticMarkup(<FileLayoutReview table={table} disabled={false} onApply={vi.fn()} />);
    expect(html).toContain('Review header row or choose no headers');
    expect(html).not.toContain('Source rows for header selection');
  });
});
