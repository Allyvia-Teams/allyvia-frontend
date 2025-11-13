// ==============================|| PERMISSION NODE TYPES ||============================== //

/**
 * Capability flags for a permission node
 * - viewOnly: Can only view (no manage capability)
 * - manageOnly: Can only manage (no view capability)
 * - viewAndManage: Can both view and manage
 * - tab: Is a tab-based page (e.g., analytics tabs)
 */
export type NodeCapability = 'viewOnly' | 'manageOnly' | 'viewAndManage' | 'tab';

/**
 * Permission node in the tree structure
 * Represents a module, page, or action with explicit capabilities
 */
export interface PermissionNode {
  // Identity
  key: string; // Unique identifier (e.g., "employees", "employees-view")
  label: string; // Display name (e.g., "Employees & Payroll")

  // Capabilities (explicit, deterministic)
  capability: NodeCapability; // What this node can do

  // State (user selections)
  view: boolean; // View permission (enabled/disabled)
  manage: boolean; // Manage permission (enabled/disabled)

  // Metadata
  isTab?: boolean; // Is this a tab-based page (for analytics)
  description?: string; // Optional description

  // Tree structure
  children?: PermissionNode[]; // Nested nodes (pages, actions)
}

/**
 * Permission tree structure
 * Root-level nodes are modules, with pages/actions as children
 */
export type PermissionTree = PermissionNode[];
