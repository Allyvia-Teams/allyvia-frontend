import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildHealthView } from 'health/buildHealthView';

const useHealth = vi.fn();
vi.mock('api/health.api', () => ({ useHealth: () => useHealth() }));
import HealthBar from './HealthBar';

describe('health header', () => {
  it('renders nothing when the feature is off or evidence cannot be read', () => {
    useHealth.mockReturnValue({ view: null, identity: 'company' });
    expect(renderToStaticMarkup(<HealthBar />)).toBe('');
  });

  it('renders a labelled keyboard button with provisional score and mode', () => {
    const view = buildHealthView({
      scope: 'company',
      health: { score: 62, tier: 'yellow', mode: 'save', components: {}, reasons: [], inputs: {}, projection: {} },
      coverage: {}
    });
    useHealth.mockReturnValue({ view, identity: 'company' });
    const html = renderToStaticMarkup(<HealthBar />);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Business health: 62/100, Save mode, provisional. Open details');
  });
});
