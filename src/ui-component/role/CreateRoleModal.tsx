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
import { availableModulesToUITree, permissionsToUITree, type UIPermissionNode } from 'utils/permissionNodeAdapter';
import {
  buildDraftState,
  zeroDraftState,
  setViewState,
  setManageState,
  setActionState,
  applyStateToTree,
  hasAnyViewState,
  currentPermissionsFromState,
  type DraftState
} from 'utils/rolePermissionHelpers';
import { NavigationPreview } from './parts/NavigationPreview';
import { TabsAndActionsPanel } from './parts/TabsAndActionsPanel';

// Props for the modal
interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null; // If provided, edit mode; otherwise create mode
}

// ==============================|| Helper Maps ||============================== //

function buildParentMap(nodes: UIPermissionNode[], parentKey: string | null, map: Record<string, string | null> = {}) {
  nodes.forEach((node) => {
    map[node.key] = parentKey;
    if (node.children?.length) {
      buildParentMap(node.children, node.key, map);
    }
  });
  return map;
}

function indexByKey(nodes: UIPermissionNode[], idx: Record<string, UIPermissionNode> = {}) {
  nodes.forEach((node) => {
    idx[node.key] = node;
    if (node.children?.length) {
      indexByKey(node.children, idx);
    }
  });
  return idx;
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
  const [baseTree, setBaseTree] = useState<UIPermissionNode[]>([]);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [roleDisplay, setRoleDisplay] = useState('');

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

    if (!availableModules) {
      dispatch(fetchAvailableModules());
      return;
    }

    const modulesList = availableModules.available_modules || [];
    let tree: UIPermissionNode[] = [];
    let hasExistingPermissions = false;

    if (role && role.permissions && role.permissions.length > 0) {
      tree = permissionsToUITree(role.permissions);
      hasExistingPermissions = true;
    } else {
      tree = availableModulesToUITree(modulesList);
    }

    setBaseTree(tree);
    setDraftState(hasExistingPermissions ? buildDraftState(tree) : zeroDraftState(tree));
  }, [open, availableModules, role, dispatch]);

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

  const validate = (): string | undefined => {
    if (!roleDisplay.trim()) return 'Role name is required.';
    if (!hasAnyViewState(draftState)) return 'Select at least one permission to view.';
    return undefined;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      // You can use a snackbar or alert here
      alert(err);
      return;
    }

    if (!draftState) return;

    const permissions = currentPermissionsFromState(baseTree, draftState);

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

  // Preview tree: show all available modules (for clicking/selection), but with current access state
  const previewTree = useMemo(() => {
    if (!baseTree.length || !availableModules) return [];
    // Use baseTree (all modules) but apply current draft state to show access indicators
    return draftState ? applyStateToTree(baseTree, draftState) : baseTree;
  }, [baseTree, draftState, availableModules]);

  // Index all nodes (from preview tree) for selection lookup
  const nodesByKey = useMemo(() => indexByKey(previewTree), [previewTree]);
  const parentMap = useMemo(() => buildParentMap(previewTree, null), [previewTree]);

  // Selected module key (for showing tabs/actions)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Selected node for inspector
  const selectedNode = useMemo(() => {
    if (!selectedKey) return null;
    return nodesByKey[selectedKey] || null;
  }, [nodesByKey, selectedKey]);

  // Find the parent module node to show its tabs and actions
  const parentModuleNode = useMemo(() => {
    if (!selectedKey || !previewTree.length) return null;
    const node = nodesByKey[selectedKey];
    if (!node) return null;

    // If selected node is a module, return it
    if (node.level === 'module') return node;

    // If selected node is a page/tab/action, find its parent module by traversing up
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
  }, [previewTree, selectedKey, nodesByKey, parentMap]);

  const targetModuleNode = useMemo(() => {
    if (selectedNode?.level === 'module') {
      return selectedNode;
    }
    return parentModuleNode || null;
  }, [selectedNode, parentModuleNode]);

  const handleAccessChange = useCallback(
    (key: string, nextView: boolean, nextManage: boolean) => {
      setDraftState((prev) => {
        if (!prev) return prev;
        const node = nodesByKey[key];
        if (!node) return prev;

        let updatedState = prev;
        if (node.level === 'action') {
          if (nextManage !== node.access.manage) {
            updatedState = setActionState(updatedState, key, nextManage);
          }
          return updatedState;
        }

        if (node.capabilities.supportsView && nextView !== node.access.view) {
          updatedState = setViewState(updatedState, key, nextView);
        }
        if (node.capabilities.supportsManage && nextManage !== node.access.manage) {
          updatedState = setManageState(updatedState, key, nextManage);
        }
        return updatedState;
      });
    },
    [nodesByKey]
  );

  // Snackbar for feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: ''
  });

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
                gridTemplateColumns: '50% 50%',
                gap: 2.5,
                minHeight: 600
              }}
            >
              {/* Left: Navigation Preview (Always Expanded) */}
              <NavigationPreview tree={previewTree} selectedKey={selectedKey} onSelect={setSelectedKey} />

              {/* Right: Tabs & Actions Panel */}
              <Box sx={{ display: 'flex', flexDirection: 'column', height: 600, overflow: 'hidden' }}>
                {targetModuleNode ? (
                  <TabsAndActionsPanel moduleNode={targetModuleNode} onSelect={setSelectedKey} onAccessChange={handleAccessChange} />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      flex: 1,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      color: 'text.secondary',
                      px: 3
                    }}
                  >
                    <Typography variant="body2">Click a module in the preview to manage its tabs and actions.</Typography>
                  </Paper>
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
