import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Alert,
  Collapse,
  CircularProgress,
  Box,
  Typography,
  Paper,
  Snackbar
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'store';
import { fetchAvailableModules, createRole, updateRole, clearCreateRoleSuccess, clearUpdateRoleSuccess } from 'store/slices/role';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from 'types/role';
import {
  availableModulesToUITree,
  permissionsToUITree,
  uiTreeToPermissionsFormat,
  type UIPermissionNode
} from 'utils/permissionNodeAdapter';
import { RoleTree } from './parts/RoleTree';
import { NodeInspector } from './parts/NodeInspector';
import { NavigationPreview } from './parts/NavigationPreview';
import { TabsAndActionsPanel } from './parts/TabsAndActionsPanel';

// ===========================
// Types
// ===========================

export type Access = { view: boolean; manage: boolean };

export type Capabilities = {
  supportsView: boolean;
  supportsManage: boolean;
  isTab?: boolean;
};

export type NodeLevel = 'module' | 'page' | 'action';

// Props for the modal
interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null; // If provided, edit mode; otherwise create mode
}

// ===========================
// Utils: tree cloning + path helpers
// ===========================

const cloneNode = (n: UIPermissionNode): UIPermissionNode => ({
  ...n,
  access: { ...n.access },
  capabilities: { ...n.capabilities },
  children: n.children ? n.children.map(cloneNode) : [],
  _collapsedChildKey: n._collapsedChildKey
});

const cloneTree = (nodes: UIPermissionNode[]) => nodes.map(cloneNode);

// Build parent map for quick lookup of parent by key
function buildParentMap(nodes: UIPermissionNode[], parentKey: string | null, map: Record<string, string | null> = {}) {
  nodes.forEach((n) => {
    map[n.key] = parentKey;
    if (n.children && n.children.length) buildParentMap(n.children, n.key, map);
  });
  return map;
}

// Index nodes by key for O(1) access
function indexByKey(nodes: UIPermissionNode[], idx: Record<string, UIPermissionNode> = {}) {
  nodes.forEach((n) => {
    idx[n.key] = n;
    if (n.children && n.children.length) indexByKey(n.children, idx);
  });
  return idx;
}

// ===========================
// Core Invariants
// ===========================
// 1) Cannot set an unsupported bit (guard in UI + functions)
// 2) manage => view (when both supported)
// 3) Parent.view=false forces all descendants view=false & manage=false
// 4) Parents reflect OR of children when not explicitly forced by user

// ===========================
// Propagation helpers
// ===========================

function setDescendantsOff(node: UIPermissionNode) {
  if (node.capabilities.supportsView) node.access.view = false;
  if (node.capabilities.supportsManage) node.access.manage = false;
  (node.children || []).forEach(setDescendantsOff);
}

function bubbleUpRecalcManage(
  node: UIPermissionNode,
  parentIndex: Record<string, string | null>,
  nodesByKey: Record<string, UIPermissionNode>
) {
  const parentKey = parentIndex[node.key];
  if (!parentKey) return;
  const parent = nodesByKey[parentKey];
  if (!parent) return;
  const anyManage = (parent.children || []).some((c) => c.access.manage);
  if (parent.capabilities.supportsManage) parent.access.manage = anyManage;
  bubbleUpRecalcManage(parent, parentIndex, nodesByKey);
}

function bubbleUpEnsureView(
  node: UIPermissionNode,
  parentIndex: Record<string, string | null>,
  nodesByKey: Record<string, UIPermissionNode>
) {
  const parentKey = parentIndex[node.key];
  if (!parentKey) return;
  const parent = nodesByKey[parentKey];
  if (!parent) return;
  if (parent.capabilities.supportsView && !parent.access.view) parent.access.view = true;
  bubbleUpEnsureView(parent, parentIndex, nodesByKey);
}

function bubbleUpRecalcView(
  node: UIPermissionNode,
  parentIndex: Record<string, string | null>,
  nodesByKey: Record<string, UIPermissionNode>
) {
  const parentKey = parentIndex[node.key];
  if (!parentKey) return;
  const parent = nodesByKey[parentKey];
  if (!parent) return;

  // Check if any children have view enabled
  const anyView = (parent.children || []).some((c) => c.access.view || c.access.manage);

  // Only update parent view if it's not explicitly set by user
  // If no children have view, remove view from parent
  if (parent.capabilities.supportsView) {
    parent.access.view = anyView;
    // If parent.view turned false, ensure manage is also false
    if (!parent.access.view && parent.capabilities.supportsManage) {
      parent.access.manage = false;
    }
  }

  // Recursively bubble up
  bubbleUpRecalcView(parent, parentIndex, nodesByKey);
}

// ===========================
// Toggle operations
// ===========================

// Cascade view down to all direct child pages (not tabs groups or actions)
function cascadeViewDownToPages(node: UIPermissionNode, enableView: boolean) {
  if (enableView && node.capabilities.supportsView && node.children && node.children.length > 0) {
    // When enabling view on parent module, enable view on all direct child pages
    node.children.forEach((child) => {
      // Only cascade to direct child pages (level === 'page' and not a tabs group)
      // Skip tabs groups (key ends with '-tabs') and actions (level === 'action')
      if (child.level === 'page' && !child.key.endsWith('-tabs') && child.capabilities.supportsView) {
        child.access.view = true;
        // Don't cascade further - only enable direct child pages
      }
    });
  }
  // Note: Disabling is handled by setDescendantsOff in toggleView
}

function toggleView(root: UIPermissionNode[], key: string, next: boolean) {
  const nodesByKey = indexByKey(root);
  const parentIndex = buildParentMap(root, null);
  const node = nodesByKey[key];
  if (!node || !node.capabilities.supportsView) return;

  node.access.view = next;

  if (!next) {
    // Disabling view: turn manage off here and below
    if (node.capabilities.supportsManage) node.access.manage = false;
    // Cascade down: disable all descendants
    setDescendantsOff(node);
    // Bubble view up: if this was a child, check if parent should turn off
    bubbleUpRecalcView(node, parentIndex, nodesByKey);
  } else {
    // Enabling view on a parent module: cascade view down to all direct child pages
    // Only cascade if this is a module level (has children that are pages)
    if (node.level === 'module') {
      cascadeViewDownToPages(node, true);
    }
    // Ensure parent views are enabled (bubble up to ancestors)
    bubbleUpEnsureView(node, parentIndex, nodesByKey);
  }
}

function toggleManage(root: UIPermissionNode[], key: string, next: boolean) {
  const nodesByKey = indexByKey(root);
  const parentIndex = buildParentMap(root, null);
  const node = nodesByKey[key];
  if (!node || !node.capabilities.supportsManage) return;
  if (next) {
    // manage implies view when supported
    if (node.capabilities.supportsView && !node.access.view) node.access.view = true;
    // ensure ancestors.view = true
    bubbleUpEnsureView(node, parentIndex, nodesByKey);
    node.access.manage = true;
    // bubble manage up
    bubbleUpRecalcManage(node, parentIndex, nodesByKey);
  } else {
    node.access.manage = false;
    // if no sibling manages, parent.manage might fall to false
    bubbleUpRecalcManage(node, parentIndex, nodesByKey);
  }
}

// Ensure at least one node has view for submit validation
function hasAnyView(nodes: UIPermissionNode[]): boolean {
  return nodes.some((n) => n.access.view || (n.children && hasAnyView(n.children)));
}

// ===========================
// Component
// ===========================

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ open, onClose, role }) => {
  const dispatch = useDispatch();
  const roleState = useSelector((s) => s.role);
  const {
    availableModules,
    availableModulesLoading,
    createRoleLoading,
    createRoleError,
    createRoleSuccess,
    updateRoleLoading,
    updateRoleError,
    updateRoleSuccess
  } = roleState;

  const isEditMode = !!role;

  // Draft tree = clone of available (fresh) or initial (edit)
  const [draft, setDraft] = useState<UIPermissionNode[]>([]);
  const [roleDisplay, setRoleDisplay] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState(false);

  // Initialize on open or data change
  useEffect(() => {
    if (!open) return;

    // Fetch available modules if not loaded
    if (!availableModules) {
      dispatch(fetchAvailableModules());
    }

    // Initialize role display
    if (role) {
      setRoleDisplay(role.role_display || '');
    } else {
      setRoleDisplay('');
    }
  }, [open, role, dispatch, availableModules]);

  // Initialize tree when available modules or role data changes
  useEffect(() => {
    if (!open) return;

    if (availableModules) {
      let base: UIPermissionNode[];

      if (role) {
        // Edit mode - convert existing role to UI tree
        if (role.permissions && Array.isArray(role.permissions) && role.permissions.length > 0) {
          base = permissionsToUITree(role.permissions);
        } else {
          // No permissions found - start with available modules
          base = availableModulesToUITree(availableModules.available_modules);
          const zero = (n: UIPermissionNode) => {
            if (n.capabilities.supportsView) n.access.view = false;
            if (n.capabilities.supportsManage) n.access.manage = false;
            n.children?.forEach(zero);
          };
          base.forEach(zero);
        }
      } else {
        // Create mode - convert available modules to UI tree
        base = availableModulesToUITree(availableModules.available_modules);
        // Ensure all access start as false for new roles
        const zero = (n: UIPermissionNode) => {
          if (n.capabilities.supportsView) n.access.view = false;
          if (n.capabilities.supportsManage) n.access.manage = false;
          n.children?.forEach(zero);
        };
        base.forEach(zero);
      }

      setDraft(base);

      // Expand modules by default, and expand all pages with children
      const exp: Record<string, boolean> = {};
      const expandAll = (nodes: UIPermissionNode[]) => {
        nodes.forEach((n) => {
          exp[n.key] = true;
          if (n.children && n.children.length > 0) {
            expandAll(n.children);
          }
        });
      };
      expandAll(base);
      setExpanded(exp);
      setTouched(false);
    }
  }, [open, availableModules, role]);

  // Handle success
  useEffect(() => {
    if (createRoleSuccess || updateRoleSuccess) {
      setTimeout(() => {
        dispatch(clearCreateRoleSuccess());
        dispatch(clearUpdateRoleSuccess());
        onClose();
      }, 1500);
    }
  }, [createRoleSuccess, updateRoleSuccess, dispatch, onClose]);

  const handleExpandToggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const onChangeView = (key: string, next: boolean) => {
    setDraft((prev) => {
      const newTree = cloneTree(prev);
      toggleView(newTree, key, next);
      return newTree;
    });
    setTouched(true);
  };

  const onChangeManage = (key: string, next: boolean) => {
    setDraft((prev) => {
      const newTree = cloneTree(prev);
      toggleManage(newTree, key, next);
      return newTree;
    });
    setTouched(true);
  };

  // Access change handler using view/manage booleans
  const handleAccessChange = useCallback((key: string, view: boolean, manage: boolean) => {
    setDraft((prev) => {
      const newTree = cloneTree(prev);
      const nodesByKey = indexByKey(newTree);
      const node = nodesByKey[key];
      if (!node) return prev;

      if (!view && !manage) {
        // Off: disable view and manage
        if (node.capabilities.supportsView) {
          toggleView(newTree, key, false);
        }
      } else if (view && !manage) {
        // View: enable view, disable manage
        if (node.capabilities.supportsView) {
          toggleView(newTree, key, true);
          if (node.capabilities.supportsManage && node.access.manage) {
            toggleManage(newTree, key, false);
          }
        }
      } else if (view && manage) {
        // Manage: enable both view and manage
        if (node.capabilities.supportsManage) {
          toggleManage(newTree, key, true);
        }
      }

      setTouched(true);
      return newTree;
    });
  }, []);

  const validate = (): string | undefined => {
    if (!roleDisplay.trim()) return 'Role name is required.';
    if (!hasAnyView(draft)) return 'Select at least one permission to view.';
    return undefined;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      // You can use a snackbar or alert here
      alert(err);
      return;
    }

    // Convert UI tree to Permission[] format
    const permissions = uiTreeToPermissionsFormat(draft);

    const data: CreateRoleRequest | UpdateRoleRequest = {
      role_display: roleDisplay.trim(),
      permissions: permissions // Permission[] array structure
    };

    if (isEditMode && role) {
      dispatch(updateRole({ roleId: role.id, data: data as UpdateRoleRequest }));
    } else {
      dispatch(createRole(data as CreateRoleRequest));
    }
  };

  // Filter tree to only show modules available in subscription
  const availableModuleKeys = availableModules?.available_modules.map((m) => m.key) || [];
  const filteredDraft = useMemo(() => draft.filter((node) => availableModuleKeys.includes(node.key)), [draft, availableModuleKeys]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'manage' | 'actions'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Selected node for inspector
  const selectedNode = useMemo(() => {
    if (!selectedKey) return null;
    const nodesByKey = indexByKey(filteredDraft);
    return nodesByKey[selectedKey] || null;
  }, [filteredDraft, selectedKey]);

  // Find the parent module node to show its tabs and actions
  const parentModuleNode = useMemo(() => {
    if (!selectedKey || !filteredDraft.length) return null;
    const nodesByKey = indexByKey(filteredDraft);
    const node = nodesByKey[selectedKey];
    if (!node) return null;

    // If selected node is a module, return it
    if (node.level === 'module') return node;

    // If selected node is a page/tab/action, find its parent module by traversing up
    const parentMap: Record<string, string | null> = buildParentMap(filteredDraft, null);
    let currentKey: string | null = selectedKey;
    const visited = new Set<string>();

    // Traverse up to find the module parent
    while (currentKey && !visited.has(currentKey)) {
      visited.add(currentKey);
      const parentKey: string | null = parentMap[currentKey] ?? null;
      if (!parentKey) break;

      const parentNode = nodesByKey[parentKey];
      if (parentNode && parentNode.level === 'module') {
        return parentNode;
      }
      currentKey = parentKey;
    }

    return null;
  }, [filteredDraft, selectedKey]);

  // Snackbar for feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: ''
  });

  // Handle toggle from tree - cycle through Off -> View -> Manage -> Off
  const handleToggleAccess = useCallback(
    (key: string) => {
      const nodesByKey = indexByKey(filteredDraft);
      const node = nodesByKey[key];
      if (!node) return;

      let nextView: boolean;
      let nextManage: boolean;
      let accessLabel: string;

      // Cycle: Off -> View -> Manage -> Off (respecting capabilities)
      if (!node.access.view && !node.access.manage) {
        // Off -> View (if supported) or Manage (if only manage supported)
        nextView = node.capabilities.supportsView ? true : false;
        nextManage = node.capabilities.supportsView ? false : node.capabilities.supportsManage ? true : false;
        accessLabel = node.capabilities.supportsView ? 'View' : node.capabilities.supportsManage ? 'Manage' : 'Off';
      } else if (node.access.view && !node.access.manage) {
        // View -> Manage (if supported) or Off
        nextView = node.capabilities.supportsManage ? true : false;
        nextManage = node.capabilities.supportsManage ? true : false;
        accessLabel = node.capabilities.supportsManage ? 'Manage' : 'Off';
      } else {
        // Manage -> Off
        nextView = false;
        nextManage = false;
        accessLabel = 'Off';
      }

      handleAccessChange(key, nextView, nextManage);

      // Show feedback
      setSnackbar({
        open: true,
        message: `Applied '${accessLabel}' to ${node.label}`
      });
    },
    [filteredDraft, handleAccessChange]
  );

  return (
    <>
      <Dialog open={open} maxWidth={false} fullWidth onClose={onClose} sx={{ '& .MuiDialog-paper': { maxWidth: '95vw', width: '95vw' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          {isEditMode ? 'Edit Role' : 'Create New Role'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {/* Error/Success Alerts */}
          <Collapse in={!!(createRoleError || updateRoleError)} unmountOnExit>
            <Alert severity="error" sx={{ mb: 2 }}>
              {createRoleError || updateRoleError}
            </Alert>
          </Collapse>
          <Collapse in={!!(createRoleSuccess || updateRoleSuccess)} unmountOnExit>
            <Alert severity="success" sx={{ mb: 2 }}>
              Role {isEditMode ? 'updated' : 'created'} successfully!
            </Alert>
          </Collapse>

          {/* Role Name Input */}
          <TextField
            label="Role Name"
            placeholder="e.g., Cashier, Clerk, HR Manager"
            fullWidth
            value={roleDisplay}
            onChange={(e) => setRoleDisplay(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Name of the role (shown to users)"
            size="medium"
          />

          {availableModulesLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 8, justifyContent: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2">Loading permissions…</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '25% 35% 40%',
                gap: 2.5,
                minHeight: 600
              }}
            >
              {/* Left: Navigation Preview (Smaller) */}
              <NavigationPreview tree={filteredDraft} />

              {/* Middle: Role Tree (Selection) */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  height: 600,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2
                }}
              >
                <RoleTree
                  tree={filteredDraft}
                  selectedKey={selectedKey}
                  expandedKeys={expanded}
                  searchQuery={searchQuery}
                  filter={filter}
                  onSelect={setSelectedKey}
                  onToggleExpand={handleExpandToggle}
                  onToggleAccess={handleToggleAccess}
                  onSearchChange={setSearchQuery}
                  onFilterChange={setFilter}
                  height={540}
                />
              </Paper>

              {/* Right: Tabs & Actions Panel (full height when module/tab selected, or Node Inspector + Tabs & Actions when page/action selected) */}
              <Box sx={{ display: 'flex', flexDirection: 'column', height: 600, gap: 2, overflow: 'hidden' }}>
                {selectedNode?.level === 'module' ? (
                  // When module is selected, show only Tabs & Actions Panel (full height)
                  <TabsAndActionsPanel moduleNode={selectedNode} onSelect={setSelectedKey} onAccessChange={handleAccessChange} />
                ) : selectedNode?.capabilities?.isTab === true && parentModuleNode ? (
                  // When tab is selected, show only Tabs & Actions Panel (full height) with parent module
                  <TabsAndActionsPanel moduleNode={parentModuleNode} onSelect={setSelectedKey} onAccessChange={handleAccessChange} />
                ) : (
                  // When page/action is selected, show Node Inspector + Tabs & Actions
                  <>
                    <Box sx={{ flex: '1 1 60%', minHeight: 0, overflow: 'hidden' }}>
                      <NodeInspector
                        selectedKey={selectedKey}
                        node={selectedNode}
                        onAccessChange={handleAccessChange}
                        onSelect={setSelectedKey}
                        showTabsAndActions={false}
                      />
                    </Box>
                    {parentModuleNode && (
                      <Box sx={{ flex: '1 1 40%', minHeight: 0, overflow: 'hidden', maxHeight: 280 }}>
                        <TabsAndActionsPanel moduleNode={parentModuleNode} onSelect={setSelectedKey} onAccessChange={handleAccessChange} />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={createRoleLoading || updateRoleLoading || !roleDisplay.trim()}>
            {createRoleLoading || updateRoleLoading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : isEditMode ? (
              'Update Role'
            ) : (
              'Create Role'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </>
  );
};

export default CreateRoleModal;
