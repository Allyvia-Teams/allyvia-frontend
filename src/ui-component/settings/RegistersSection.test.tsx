import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RegistersSection from './RegistersSection';

vi.mock('./Registers', () => ({ default: () => <div>Pair an iPad</div> }));
vi.mock('./RegisterReadersCard', () => ({
  default: ({ companyId }: { companyId: string }) => <div>Readers for {companyId}</div>
}));
vi.mock('./RegisterBehaviourCard', () => ({
  default: ({ companyId }: { companyId: string }) => <div>Behavior for {companyId}</div>
}));

describe('integrated register settings', () => {
  it('keeps one pairing surface alongside company-scoped reader and behavior controls', () => {
    const html = renderToStaticMarkup(<RegistersSection companyId="boutique-a" />);
    expect(html.match(/Pair an iPad/g)).toHaveLength(1);
    expect(html).toContain('Readers for boutique-a');
    expect(html).toContain('Behavior for boutique-a');
  });
});
