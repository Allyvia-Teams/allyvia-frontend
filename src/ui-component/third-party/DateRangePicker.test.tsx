import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AllyviaDateRangePicker } from './DateRangePicker';

// The popover is portaled and closed on first render, so these cover the
// trigger only: what the owner reads before opening the picker.
const html = (node: React.ReactElement) => renderToString(node).replace(/<!-- -->/g, '');

describe('AllyviaDateRangePicker trigger', () => {
  it('shows a custom range as plain dates', () => {
    const out = html(
      <AllyviaDateRangePicker value={{ start: new CalendarDate(2025, 11, 3), end: new CalendarDate(2025, 11, 12) }} onChange={() => {}} />
    );
    expect(out).toContain('Nov 3 – Nov 12, 2025');
  });
  it('names the preset when the range matches one', () => {
    const t = today(getLocalTimeZone());
    const out = html(<AllyviaDateRangePicker value={{ start: t.subtract({ days: 29 }), end: t }} onChange={() => {}} />);
    expect(out).toContain('Last 30 days');
  });
  it('shows the placeholder when nothing is selected', () => {
    expect(html(<AllyviaDateRangePicker value={null} onChange={() => {}} placeholder="Any date" />)).toContain('Any date');
  });
});
