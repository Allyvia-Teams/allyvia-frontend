import { describe, expect, it, vi } from 'vitest';

import { memoryStorage } from './testing/memoryStorage';
import { forgetDismissed, readVisitRecord, recordActed, recordDismissed, VISIT_RECORD_KEY, type RecordStorage } from './visitRecord';

const AT = 'today at 7:02 AM';

describe('visit record', () => {
  it('reads empty when nothing is stored, or there is no storage', () => {
    expect(readVisitRecord(memoryStorage(), AT)).toEqual({ refreshedAt: AT, acted: [], dismissed: [] });
    expect(readVisitRecord(null, AT)).toEqual({ refreshedAt: AT, acted: [], dismissed: [] });
  });

  it('reads empty for corrupt JSON, a wrong shape, or a record from another payload', () => {
    for (const raw of [
      '{not json',
      '42',
      'null',
      '[]',
      JSON.stringify({ refreshedAt: 'yesterday at 7:02 AM', acted: [{ id: 'a', at: 1 }] })
    ]) {
      expect(readVisitRecord(memoryStorage({ [VISIT_RECORD_KEY]: raw }), AT)).toEqual({ refreshedAt: AT, acted: [], dismissed: [] });
    }
  });

  it('survives storage that throws on read and on write', () => {
    const throwing: RecordStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(readVisitRecord(throwing, AT).acted).toEqual([]);
    expect(recordActed(throwing, AT, 'rec-a', 1).acted).toEqual([{ id: 'rec-a', at: 1 }]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps well-formed entries and drops the rest; an unknown reason reads as none', () => {
    const raw = JSON.stringify({
      refreshedAt: AT,
      acted: [{ id: 'a', at: 1 }, { id: 2, at: 1 }, 'x'],
      dismissed: [
        { id: 'b', reason: 'not_relevant', at: 2 },
        { id: 'c', reason: 'made_up', at: 3 },
        { id: 'd', at: 'soon' }
      ]
    });
    expect(readVisitRecord(memoryStorage({ [VISIT_RECORD_KEY]: raw }), AT)).toEqual({
      refreshedAt: AT,
      acted: [{ id: 'a', at: 1 }],
      dismissed: [
        { id: 'b', reason: 'not_relevant', at: 2 },
        { id: 'c', reason: null, at: 3 }
      ]
    });
  });

  it('records acted once and dismissals with reason and time, under the payload’s refreshedAt', () => {
    const storage = memoryStorage();
    recordActed(storage, AT, 'rec-a', 10);
    recordActed(storage, AT, 'rec-a', 20);
    recordDismissed(storage, AT, { id: 'rec-b', reason: 'already_doing_it' }, 30);
    recordDismissed(storage, AT, { id: 'rec-c', reason: null }, 40);
    expect(readVisitRecord(storage, AT)).toEqual({
      refreshedAt: AT,
      acted: [{ id: 'rec-a', at: 10 }],
      dismissed: [
        { id: 'rec-b', reason: 'already_doing_it', at: 30 },
        { id: 'rec-c', reason: null, at: 40 }
      ]
    });
  });

  it('starts over when the payload is refreshed', () => {
    const storage = memoryStorage();
    recordActed(storage, 'yesterday at 7:02 AM', 'rec-a', 10);
    recordActed(storage, AT, 'rec-b', 20);
    expect(readVisitRecord(storage, AT).acted).toEqual([{ id: 'rec-b', at: 20 }]);
    expect(readVisitRecord(storage, 'yesterday at 7:02 AM').acted).toEqual([]);
  });

  it('forgets a dismissal whose send failed, and keeps everything else', () => {
    const storage = memoryStorage();
    recordActed(storage, AT, 'a', 1);
    recordDismissed(storage, AT, { id: 'a', reason: null }, 2);
    recordDismissed(storage, AT, { id: 'b', reason: 'not_relevant' }, 3);
    forgetDismissed(storage, AT, 'a');
    expect(readVisitRecord(storage, AT)).toEqual({
      refreshedAt: AT,
      acted: [{ id: 'a', at: 1 }],
      dismissed: [{ id: 'b', reason: 'not_relevant', at: 3 }]
    });
  });
});
