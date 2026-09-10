import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REGISTER_ROLE,
  REGISTER_ROLE_OPTIONS,
  REGISTER_ROLE_RANK,
  registerRoleColor,
  registerRoleDisplay,
  registerRoleLabel,
  registerRolePatch
} from './registerRoles';
import type { Employee } from 'types/employee';

const employee = (over: Partial<Employee> = {}): Employee =>
  ({
    id: 'e1',
    first_name: 'Aarya',
    last_name: 'Sen',
    full_name: 'Aarya Sen',
    email: 'aarya@example.com',
    status: 'active',
    is_active: true,
    ...over
  }) as Employee;

describe('the option list', () => {
  it('offers exactly the three roles the register enforces, in ladder order', () => {
    // register/permissions.py: associate < keyholder < manager. A fourth
    // option here would be a role no backend gate recognises.
    expect(REGISTER_ROLE_OPTIONS.map((option) => option.value)).toEqual(['associate', 'keyholder', 'manager']);
    expect(Object.keys(REGISTER_ROLE_RANK)).toEqual(['associate', 'keyholder', 'manager']);
    expect(REGISTER_ROLE_RANK.manager).toBeGreaterThan(REGISTER_ROLE_RANK.keyholder);
    expect(REGISTER_ROLE_RANK.keyholder).toBeGreaterThan(REGISTER_ROLE_RANK.associate);
  });

  it('matches the server default', () => {
    expect(DEFAULT_REGISTER_ROLE).toBe('associate');
  });

  it('describes every option, since the form shows the description as help text', () => {
    REGISTER_ROLE_OPTIONS.forEach((option) => {
      expect(option.description.length).toBeGreaterThan(10);
      expect(option.label).toBeTruthy();
    });
  });
});

describe('registerRoleLabel', () => {
  it('names the three roles the way the REGISTER does', () => {
    // "Stylist", not "Associate": employee/models.py::REGISTER_ROLE_LABELS is
    // what the iPad renders, and the two surfaces must agree on the word even
    // though the stored value is `associate`.
    expect(registerRoleLabel('associate')).toBe('Stylist');
    expect(registerRoleLabel('keyholder')).toBe('Keyholder');
    expect(registerRoleLabel('manager')).toBe('Manager');
  });

  it('shows an unknown role verbatim rather than relabelling it', () => {
    // Quietly mapping an unrecognised role to the lowest one would understate
    // what that person can do -- the server, not this list, owns the vocabulary.
    expect(registerRoleLabel('supervisor')).toBe('supervisor');
  });

  it('falls back to the base role only for a genuinely absent value', () => {
    expect(registerRoleLabel(null)).toBe('Stylist');
    expect(registerRoleLabel(undefined)).toBe('Stylist');
  });
});

describe('registerRoleColor', () => {
  it('escalates with the ladder', () => {
    expect(registerRoleColor('manager')).toBe('primary');
    expect(registerRoleColor('keyholder')).toBe('info');
    expect(registerRoleColor('associate')).toBe('default');
    expect(registerRoleColor(undefined)).toBe('default');
  });
});

describe('registerRoleDisplay', () => {
  it('reports the stored role when nothing elevates it', () => {
    const display = registerRoleDisplay(employee({ register_role: 'keyholder', effective_register_role: 'keyholder' }));
    expect(display).toMatchObject({ stored: 'keyholder', effective: 'keyholder', elevated: false, label: 'Keyholder', note: null });
  });

  it('leads with the EFFECTIVE role when an admin login elevates it', () => {
    // The case that matters. Employee.effective_register_role resolves anyone
    // whose email matches an admin Role in this company to manager, whatever
    // the stored field says -- so an owner who left themselves on Associate can
    // still edit the rota on the iPad. Showing the stored value would be wrong
    // in the direction that matters: it understates their access.
    const display = registerRoleDisplay(employee({ register_role: 'associate', effective_register_role: 'manager' }));
    expect(display.stored).toBe('associate');
    expect(display.effective).toBe('manager');
    expect(display.elevated).toBe(true);
    expect(display.label).toBe('Manager');
    expect(display.note).toContain('admin login');
  });

  it('treats a missing effective role as equal to the stored one', () => {
    // An endpoint that omits the computed field must not read as a demotion.
    const display = registerRoleDisplay(employee({ register_role: 'manager' }));
    expect(display.effective).toBe('manager');
    expect(display.elevated).toBe(false);
  });

  it('defaults both halves when the employee predates the field', () => {
    const display = registerRoleDisplay(employee());
    expect(display).toMatchObject({ stored: 'associate', effective: 'associate', elevated: false });
  });

  it('only calls it elevated when the effective role is HIGHER', () => {
    // Compared by rank rather than inequality: a value that differed downward
    // would otherwise render the note "Stylist on the register because they
    // have an admin login here", which contradicts itself. Not reachable
    // against the documented server behaviour, but the rank costs nothing.
    const downward = registerRoleDisplay(employee({ register_role: 'manager', effective_register_role: 'associate' }));
    expect(downward.elevated).toBe(false);
    expect(downward.note).toBeNull();
  });
});

describe('registerRolePatch', () => {
  it('sends the role the admin picked', () => {
    expect(registerRolePatch('keyholder')).toEqual({ register_role: 'keyholder' });
    expect(registerRolePatch('manager')).toEqual({ register_role: 'manager' });
    expect(registerRolePatch('associate')).toEqual({ register_role: 'associate' });
  });

  it('OMITS THE KEY when the role is unknown, rather than defaulting it', () => {
    // The silent demotion this exists to prevent: the edit modal's detail
    // fetch fails and it falls back to a list row without the field, so the
    // Select shows the base role. An admin corrects a phone number, the body
    // is rebuilt from a hand-written literal, and a store manager loses the
    // rota and the discount authority on the till -- under a toast that says
    // "Employee updated successfully!" and never mentions the register.
    //
    // An absent key leaves the stored role alone, which is the only safe
    // reading of "nobody told me what this is".
    expect(registerRolePatch(undefined)).toEqual({});
    expect(registerRolePatch(null)).toEqual({});
    expect('register_role' in registerRolePatch(undefined)).toBe(false);
  });

  it('is spreadable into a PATCH body without adding an undefined key', () => {
    // How the caller uses it. `{...{register_role: undefined}}` would still put
    // the key on the object, and axios serializes that as null.
    const body = { title: 'Stylist', ...registerRolePatch(undefined) };
    expect(Object.keys(body)).toEqual(['title']);
  });
});
