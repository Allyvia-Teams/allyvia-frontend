import type { Employee, EmployeeListItem, RegisterRole } from 'types/employee';

/**
 * What an employee may do on a paired iPad till.
 *
 * Deliberately NOT in utils/role.ts. That file's RoleType is the back-office
 * authorization role (admin / manager / member / viewer) and it also has a
 * value spelled "manager" — a different concept with a different ladder. An
 * employee can be a register manager without any back-office login at all;
 * there is no Employee→User foreign key.
 *
 * The ladder, from register/permissions.py: associate < keyholder < manager.
 */
export const REGISTER_ROLE_OPTIONS: Array<{ value: RegisterRole; label: string; description: string }> = [
  // "Stylist", not "Associate". The value is `associate` and the model's own
  // choices label says Associate, but employee/models.py::REGISTER_ROLE_LABELS
  // -- the map the register actually renders on the PIN screen and the roster
  // -- calls it Stylist. An owner who set someone to "Associate" here and then
  // saw "Stylist" on the till would reasonably think something had gone wrong.
  { value: 'associate', label: 'Stylist', description: 'Sell, look up stock, clock in and out.' },
  { value: 'keyholder', label: 'Keyholder', description: 'Also adjust stock, receive deliveries and discount within the limit.' },
  { value: 'manager', label: 'Manager', description: 'Everything, including the rota and any discount.' }
];

export const REGISTER_ROLE_RANK: Record<RegisterRole, number> = {
  associate: 1,
  keyholder: 2,
  manager: 3
};

/** The server's default for a new employee (Employee.register_role). */
export const DEFAULT_REGISTER_ROLE: RegisterRole = 'associate';

/**
 * A role's display name.
 *
 * An unrecognised value is shown verbatim rather than mapped to the default:
 * the server owns this vocabulary, and quietly relabelling a role the client
 * has not heard of as "Associate" would understate what that person can do.
 */
export const registerRoleLabel = (role: string | null | undefined): string => {
  if (!role) return 'Stylist';
  const known = REGISTER_ROLE_OPTIONS.find((option) => option.value === role);
  return known ? known.label : role;
};

export const registerRoleColor = (role: string | null | undefined): 'default' | 'info' | 'primary' => {
  if (role === 'manager') return 'primary';
  if (role === 'keyholder') return 'info';
  return 'default';
};

/**
/**
 * The `register_role` key to include in an employee PATCH, or nothing.
 *
 * The edit modal's submit path rebuilds the PATCH body from a hand-written
 * literal, so whatever this returns is exactly what reaches the wire.
 *
 * It returns NOTHING for an absent role, and that pairs with the modal NOT
 * defaulting the field on hydration. Defaulting plus an unconditional send is a
 * silent demotion: the detail fetch fails, the modal falls back to a list row
 * that lacks the field, the Select shows the base role, an admin corrects a
 * phone number — and a store manager quietly loses the rota and the discount
 * authority on the till, under a success toast that never mentions the
 * register. Omitting the key leaves the stored role alone, which is the only
 * safe reading of "I was not told what this is".
 */
export const registerRolePatch = (role: RegisterRole | undefined | null): { register_role?: RegisterRole } =>
  role ? { register_role: role } : {};

export interface RegisterRoleDisplay {
  /** What the form writes. */
  stored: RegisterRole;
  /** What the iPad actually enforces. */
  effective: RegisterRole;
  /** True when the admin login is doing the lifting, not the stored role. */
  elevated: boolean;
  label: string;
  /** Set only when elevated — the sentence that explains the mismatch. */
  note: string | null;
}

/**
 * How a person's register role should read in the UI.
 *
 * The two values can legitimately disagree: the server resolves an employee
 * whose email matches an admin login in this company to `manager` regardless of
 * the stored field, so an owner cannot lock themselves out of their own till.
 *
 * Showing the stored value alone would UNDERSTATE what that person can do — an
 * owner set to "Associate" would still be able to edit the rota on the iPad —
 * so the display leads with the effective role and explains the difference.
 */
export const registerRoleDisplay = (employee: Employee | EmployeeListItem): RegisterRoleDisplay => {
  const stored = (employee.register_role || DEFAULT_REGISTER_ROLE) as RegisterRole;
  // An older serializer, or a list endpoint that omits it, leaves the stored
  // role as the only thing known — which is the honest fallback.
  const effective = (employee.effective_register_role || stored) as RegisterRole;
  // Compared by RANK, not inequality: the note explains an ELEVATION, so a
  // value that differed downward would otherwise render "Stylist * — Stylist on
  // the register because they have an admin login here", a sentence that
  // contradicts itself. Unreachable against the documented server behaviour,
  // which only ever raises the role, and the rank is right here.
  const elevated = (REGISTER_ROLE_RANK[effective] ?? 0) > (REGISTER_ROLE_RANK[stored] ?? 0);
  return {
    stored,
    effective,
    elevated,
    label: registerRoleLabel(effective),
    note: elevated ? `${registerRoleLabel(effective)} on the register because they have an admin login here.` : null
  };
};
