import {
  ACTION_PERMISSIONS,
  TOGGLABLE_MODULES,
  isModuleKey,
  type ActionPermissionKey,
  type ModuleKey,
  type ModulePermissions,
  type PermissionKey
} from 'types/settings';

/**
 * The permission dialog's logic, kept pure so it can be tested (ALL-72).
 *
 * The one rule that matters: an action key depends on its module. The backend
 * refuses "pos.refund without pos" with a 400 naming the pair, so the draft
 * must never be able to hold that shape — not because the server would accept
 * it, but because "saved" followed by a member who still cannot take a refund
 * is the worst possible answer, and a 400 the admin has to decode is the
 * second worst.
 */

export const actionsForModule = (module: ModuleKey) => ACTION_PERMISSIONS.filter((a) => a.module === module);

export const actionParentModule = (key: ActionPermissionKey): ModuleKey => {
  const entry = ACTION_PERMISSIONS.find((a) => a.key === key);
  // Unreachable while ActionPermissionKey is closed; a loud failure beats a
  // silent one if the catalogue and the type ever drift apart.
  if (!entry) throw new Error(`Unknown action permission ${key}`);
  return entry.module;
};

/**
 * Flip one key. Turning a MODULE off also clears every action that depends on
 * it, so the draft can never carry a dead grant the server would refuse.
 * Turning a module back on does NOT restore them: a re-grant is a decision,
 * not an undo.
 */
export function togglePermission(draft: ModulePermissions, key: PermissionKey): ModulePermissions {
  const next: ModulePermissions = { ...draft, [key]: !draft[key] };
  // Employee deletion requires management; roster and approval stay independent.
  if (key === 'employees.delete' && next[key]) next['employees.manage'] = true;
  if (key === 'employees.manage' && !next[key]) next['employees.delete'] = false;
  if (isModuleKey(key) && !next[key]) {
    actionsForModule(key).forEach((action) => {
      delete next[action.key];
    });
  }
  return next;
}

/** Granted action keys whose module is not granted — what the server calls a dead grant. */
export const orphanActionKeys = (perms: ModulePermissions): ActionPermissionKey[] =>
  ACTION_PERMISSIONS.filter((a) => perms[a.key] && !perms[a.module]).map((a) => a.key);

/**
 * The body for PUT /role/{id}/.
 *
 * Only granted keys, so the stored object stays compact ({pos: true} rather
 * than every key set false), and never an orphan. The orphan drop is belt and
 * braces — togglePermission already prevents one — but a role hand-edited
 * before the server validated this column can arrive holding one, and sending
 * it back would 400 a save that touched nothing near it.
 */
export function cleanPermissions(draft: ModulePermissions): ModulePermissions {
  const cleaned: ModulePermissions = {};
  (Object.keys(draft) as PermissionKey[]).forEach((key) => {
    if (draft[key]) cleaned[key] = true;
  });
  orphanActionKeys(cleaned).forEach((key) => {
    delete cleaned[key];
  });
  return cleaned;
}

/** Modules AND actions, so the summary column does not undercount. */
export const grantedCount = (perms: ModulePermissions): number =>
  TOGGLABLE_MODULES.filter((m) => perms[m.key]).length + ACTION_PERMISSIONS.filter((a) => perms[a.key]).length;

/** The denominator for that column. */
export const GRANTABLE_TOTAL = TOGGLABLE_MODULES.length + ACTION_PERMISSIONS.length;

export const permissionsDirty = (a: ModulePermissions, b: ModulePermissions): boolean => {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!!a[key as PermissionKey] !== !!b[key as PermissionKey]) return true;
  }
  return false;
};
