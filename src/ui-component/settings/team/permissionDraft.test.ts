import { describe, expect, it } from 'vitest';

import {
  GRANTABLE_TOTAL,
  actionParentModule,
  actionsForModule,
  cleanPermissions,
  grantedCount,
  orphanActionKeys,
  permissionsDirty,
  togglePermission
} from './permissionDraft';
import { ACTION_PERMISSIONS, TOGGLABLE_MODULES, isActionPermissionKey, isModuleKey } from 'types/settings';

describe('the catalogue', () => {
  it('hangs both refund actions off pos', () => {
    expect(actionParentModule('pos.refund')).toBe('pos');
    expect(actionParentModule('pos.refund.approve')).toBe('pos');
    expect(actionsForModule('pos').map((a) => a.key)).toEqual(['pos.refund', 'pos.refund.approve']);
    expect(actionsForModule('finance')).toEqual([]);
  });

  it('tells module keys and action keys apart', () => {
    expect(isModuleKey('pos')).toBe(true);
    expect(isModuleKey('pos.refund')).toBe(false);
    expect(isActionPermissionKey('pos.refund')).toBe(true);
    expect(isActionPermissionKey('pos')).toBe(false);
    expect(isModuleKey('finances')).toBe(false);
  });
});

describe('a member with pos but not pos.refund', () => {
  // The brief's first case: the common shape, and it must save cleanly.
  it('produces a body the server accepts', () => {
    const body = cleanPermissions({ pos: true, 'pos.refund': false });
    expect(body).toEqual({ pos: true });
    expect(orphanActionKeys(body)).toEqual([]);
  });

  it('can be granted the action in one toggle', () => {
    const next = togglePermission({ pos: true }, 'pos.refund');
    expect(cleanPermissions(next)).toEqual({ pos: true, 'pos.refund': true });
    expect(orphanActionKeys(next)).toEqual([]);
  });
});

describe('turning pos off', () => {
  // The brief's second case, and the rule that protects the save: the
  // backend 400s "pos.refund without pos", so the draft must never hold it.
  it('clears both dotted keys from the payload', () => {
    const next = togglePermission({ pos: true, 'pos.refund': true, 'pos.refund.approve': true }, 'pos');
    expect(cleanPermissions(next)).toEqual({});
    expect(next).not.toHaveProperty('pos.refund');
    expect(next).not.toHaveProperty('pos.refund.approve');
  });

  it('leaves unrelated modules alone', () => {
    const next = togglePermission({ pos: true, 'pos.refund': true, finance: true }, 'pos');
    expect(cleanPermissions(next)).toEqual({ finance: true });
  });

  it('does not restore the actions when pos is turned back on', () => {
    const off = togglePermission({ pos: true, 'pos.refund': true }, 'pos');
    const on = togglePermission(off, 'pos');
    expect(cleanPermissions(on)).toEqual({ pos: true });
  });
});

describe('employee permission dependencies', () => {
  it('grants management when deletion is enabled while preserving approval and refunds', () => {
    const draft = { 'employees.approve': true, pos: true, 'pos.refund': true };
    const next = togglePermission(draft, 'employees.delete');
    expect(cleanPermissions(next)).toEqual({ ...draft, 'employees.manage': true, 'employees.delete': true });
    expect(draft).not.toHaveProperty('employees.manage');
  });

  it('removes deletion when management is disabled without revoking independent grants', () => {
    const independent = { employees: true, 'employees.approve': true, pos: true, 'pos.refund': true };
    const off = togglePermission({ ...independent, 'employees.manage': true, 'employees.delete': true }, 'employees.manage');
    expect(cleanPermissions(off)).toEqual(independent);
    expect(cleanPermissions(togglePermission(off, 'employees.manage'))).toEqual({ ...independent, 'employees.manage': true });
  });
});

describe('cleanPermissions', () => {
  it('strips false values so the stored object stays compact', () => {
    expect(cleanPermissions({ pos: true, finance: false, crm: false })).toEqual({ pos: true });
  });

  it('drops a pre-existing orphan the server would refuse', () => {
    // A role hand-edited before the column was validated can arrive like this.
    expect(cleanPermissions({ 'pos.refund': true })).toEqual({});
    expect(orphanActionKeys({ 'pos.refund': true, 'pos.refund.approve': true })).toEqual(['pos.refund', 'pos.refund.approve']);
  });

  it('keeps an action whose module is granted', () => {
    expect(cleanPermissions({ pos: true, 'pos.refund.approve': true })).toEqual({ pos: true, 'pos.refund.approve': true });
  });

  it('does not mutate its input', () => {
    const draft = { pos: true, 'pos.refund': false } as const;
    cleanPermissions(draft);
    expect(draft).toEqual({ pos: true, 'pos.refund': false });
  });
});

describe('grantedCount', () => {
  // The brief's third case: the summary column silently undercounted.
  it('counts action keys as well as modules', () => {
    expect(grantedCount({ pos: true })).toBe(1);
    expect(grantedCount({ pos: true, 'pos.refund': true })).toBe(2);
    expect(grantedCount({ pos: true, 'pos.refund': true, 'pos.refund.approve': true })).toBe(3);
  });

  it('ignores false values and baseline modules', () => {
    expect(grantedCount({ pos: false, inventory: true, clock: true })).toBe(0);
  });

  it('has a denominator that includes the actions', () => {
    expect(GRANTABLE_TOTAL).toBe(TOGGLABLE_MODULES.length + ACTION_PERMISSIONS.length);
    const everything = Object.fromEntries([
      ...TOGGLABLE_MODULES.map((m) => [m.key, true]),
      ...ACTION_PERMISSIONS.map((a) => [a.key, true])
    ]);
    expect(grantedCount(everything)).toBe(GRANTABLE_TOTAL);
  });
});

describe('permissionsDirty', () => {
  it('treats a missing key and false as the same', () => {
    expect(permissionsDirty({ pos: true }, { pos: true, finance: false })).toBe(false);
  });

  it('notices an action key changing', () => {
    expect(permissionsDirty({ pos: true }, { pos: true, 'pos.refund': true })).toBe(true);
  });
});
