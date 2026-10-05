import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// api/register.api and api/inventoryStock.api both reach utils/axios → utils/mockApi,
// which reads localStorage at module load and cannot be imported under vitest's node
// environment; `store` reaches it too, through the same chain. Factory mocks replace
// them outright (the pattern in NetworkPerksPanel.test.tsx and agent.api.test.ts).
const reissuePairingCode = vi.fn();
const revokeRegisterDevice = vi.fn();
const createRegisterDevice = vi.fn();
const updateRegisterDevice = vi.fn();
const listRegisterDevices = vi.fn();

vi.mock('api/register.api', () => ({
  listRegisterDevices: (...a: unknown[]) => listRegisterDevices(...a),
  createRegisterDevice: (...a: unknown[]) => createRegisterDevice(...a),
  updateRegisterDevice: (...a: unknown[]) => updateRegisterDevice(...a),
  reissuePairingCode: (...a: unknown[]) => reissuePairingCode(...a),
  revokeRegisterDevice: (...a: unknown[]) => revokeRegisterDevice(...a)
}));

vi.mock('api/inventoryStock.api', () => ({
  listLocations: vi.fn().mockResolvedValue([])
}));

vi.mock('store', () => ({
  dispatch: vi.fn(),
  useSelector: (fn: unknown) => (typeof fn === 'function' ? (fn as (s: unknown) => unknown)({ auth: {} }) : undefined)
}));

vi.mock('store/slices/snackbar', () => ({ openSnackbar: vi.fn() }));

import type { RegisterDevice } from 'api/register.api';
import {
  PairingCodePanel,
  RegisterDeviceTable,
  REGISTERS_INTRO,
  formatCountdown,
  formatLastSeen,
  rePairWarning,
  sortDevices
} from './Registers';

const device = (over: Partial<RegisterDevice> & Pick<RegisterDevice, 'id' | 'name' | 'status'>): RegisterDevice => ({
  location: null,
  pairing_expires_at: null,
  paired_at: null,
  last_seen_at: null,
  revoked_at: null,
  created_at: '2026-09-01T10:00:00Z',
  ...over
});

const REVOKED = device({ id: 'd1', name: 'Storeroom iPad', status: 'revoked', revoked_at: '2026-09-05T10:00:00Z' });
const PENDING = device({ id: 'd2', name: 'Back till', status: 'pending' });
const ACTIVE = device({
  id: 'd3',
  name: 'Front till',
  status: 'active',
  paired_at: '2026-09-02T10:00:00Z',
  last_seen_at: new Date().toISOString(),
  location: { id: 'loc-1', name: 'Flagship' }
});

const noop = () => {};
const tableProps = {
  onRename: noop,
  onRelocate: noop,
  onShowCode: noop,
  onRePair: noop,
  onRevoke: noop,
  onAdd: noop
};

beforeEach(() => {
  reissuePairingCode.mockReset();
  revokeRegisterDevice.mockReset();
});

describe('the intro copy', () => {
  it('matches the instruction the iPad gives the owner', () => {
    // ios-app/src/app/pair.tsx: "In Allyvia OS, open Settings › Registers and add
    // this iPad. Enter the 8-character code it shows." The owner arrives here
    // holding that sentence, so this page has to answer it in the same words.
    expect(REGISTERS_INTRO).toBe('Pair an iPad running Allyvia Register. Add a device here, then enter the code it shows on the iPad.');
  });
});

describe('sortDevices', () => {
  it('puts active first, then pending, then revoked', () => {
    const order = sortDevices([REVOKED, PENDING, ACTIVE]).map((d) => d.name);
    expect(order).toEqual(['Front till', 'Back till', 'Storeroom iPad']);
  });

  it('does not mutate the list it was given', () => {
    const input = [REVOKED, PENDING, ACTIVE];
    sortDevices(input);
    expect(input.map((d) => d.name)).toEqual(['Storeroom iPad', 'Back till', 'Front till']);
  });

  it('keeps a stable order within one status', () => {
    const a = device({ id: 'a', name: 'Till A', status: 'pending' });
    const b = device({ id: 'b', name: 'Till B', status: 'pending' });
    expect(sortDevices([a, b]).map((d) => d.id)).toEqual(['a', 'b']);
  });
});

describe('the device table', () => {
  it('offers a single call to action when no iPad has been added', () => {
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[]} {...tableProps} />);

    expect(html).toContain('No iPads yet');
    expect(html).toContain('Add iPad');
  });

  it('renders rows active first, then pending, then revoked', () => {
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[REVOKED, PENDING, ACTIVE]} {...tableProps} />);

    expect(html.indexOf('Front till')).toBeLessThan(html.indexOf('Back till'));
    expect(html.indexOf('Back till')).toBeLessThan(html.indexOf('Storeroom iPad'));
  });

  it('never shows a pairing code, because the list response does not carry one', () => {
    // The code is hashed server-side and returned exactly once, from the request
    // that minted it. A code appearing on a listed row would mean we had cached
    // a one-time secret somewhere it can be read again.
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[ACTIVE, PENDING]} {...tableProps} />);

    expect(html).not.toMatch(/[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}/);
  });

  it('shows an em dash for an iPad that has never checked in', () => {
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[PENDING]} {...tableProps} />);

    expect(html).toContain('—');
  });

  it('leaves a revoked row with no action but its own label', () => {
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[REVOKED]} {...tableProps} />);

    // Re-issuing on a revoked device is a 409; the row must not invite it.
    expect(html).toContain('Revoked');
    expect(html).not.toContain('Show pairing code');
    expect(html).not.toContain('Re-pair');
  });

  it('locks a row while its own request is in flight', () => {
    // "Show pairing code" fires immediately, with no dialog in the way. A second
    // click would mint a second code and silently invalidate the first, so the
    // owner would be reading a dead code off the screen.
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[PENDING]} {...tableProps} busyId={PENDING.id} />);

    const buttons = html.match(/<button[^>]*>/g) || [];
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toContain('disabled'));
  });

  it('leaves other rows usable while one is busy', () => {
    const html = renderToStaticMarkup(<RegisterDeviceTable devices={[PENDING, ACTIVE]} {...tableProps} busyId={PENDING.id} />);

    expect((html.match(/<button[^>]*disabled/g) || []).length).toBeLessThan((html.match(/<button/g) || []).length);
  });

  it('offers the pending row its code and the active row a re-pair', () => {
    const pendingHtml = renderToStaticMarkup(<RegisterDeviceTable devices={[PENDING]} {...tableProps} />);
    const activeHtml = renderToStaticMarkup(<RegisterDeviceTable devices={[ACTIVE]} {...tableProps} />);

    expect(pendingHtml).toContain('Show pairing code');
    expect(activeHtml).toContain('Re-pair');
  });
});

describe('the pairing code panel', () => {
  it('shows the eight characters and the time left', () => {
    const html = renderToStaticMarkup(<PairingCodePanel code="ABCD2345" secondsRemaining={899} onRefresh={noop} />);

    expect(html).toContain('ABCD2345');
    expect(html).toContain('Expires in 14:59');
  });

  it('says plainly that the code is shown once', () => {
    const html = renderToStaticMarkup(<PairingCodePanel code="ABCD2345" secondsRemaining={900} onRefresh={noop} />);

    expect(html).toContain('This code is shown once. If you close this window you will need to generate a new one.');
  });

  it('replaces the countdown with a way out once it reaches zero', () => {
    const html = renderToStaticMarkup(<PairingCodePanel code="ABCD2345" secondsRemaining={0} onRefresh={noop} />);

    expect(html).toContain('Code expired');
    expect(html).toContain('Get a new code');
    expect(html).not.toContain('Expires in');
  });

  it('surfaces a backend detail string instead of the code when one is passed', () => {
    const html = renderToStaticMarkup(
      <PairingCodePanel
        code="ABCD2345"
        secondsRemaining={0}
        onRefresh={noop}
        error="This device is revoked. Create a new device to pair an iPad."
      />
    );

    expect(html).toContain('This device is revoked. Create a new device to pair an iPad.');
  });
});

describe('formatCountdown', () => {
  it('reads as minutes and padded seconds', () => {
    expect(formatCountdown(900)).toBe('15:00');
    expect(formatCountdown(899)).toBe('14:59');
    expect(formatCountdown(61)).toBe('1:01');
    expect(formatCountdown(9)).toBe('0:09');
  });

  it('floors at zero rather than counting backwards', () => {
    // A tab left open past expiry must not render "Expires in -3:12".
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-30)).toBe('0:00');
  });
});

describe('formatLastSeen', () => {
  it('is an em dash when the iPad has never checked in', () => {
    expect(formatLastSeen(null)).toBe('—');
  });

  it('is relative for a real timestamp', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatLastSeen(twoHoursAgo)).toMatch(/ago$/);
  });

  it('falls back to the raw value rather than throwing on a malformed date', () => {
    expect(formatLastSeen('not-a-date')).toBe('not-a-date');
  });
});

describe('the re-pair confirmation', () => {
  it('names the iPad that is about to be signed out', () => {
    expect(rePairWarning('Front till')).toBe('The iPad currently paired as Front till will be signed out.');
  });

  it('is only copy — showing it calls nothing', () => {
    // Re-issuing on an ACTIVE device un-pairs the till mid-shift. The warning
    // has to come strictly before the request, never alongside it.
    rePairWarning(ACTIVE.name);
    renderToStaticMarkup(<RegisterDeviceTable devices={[ACTIVE]} {...tableProps} />);

    expect(reissuePairingCode).not.toHaveBeenCalled();
    expect(revokeRegisterDevice).not.toHaveBeenCalled();
  });
});
