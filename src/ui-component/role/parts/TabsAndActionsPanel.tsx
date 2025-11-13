import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Chip,
  Typography,
  Divider,
  Box,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  IconButton
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getActionIcon, getIconComponent } from 'utils/permission-icons';

interface TabsAndActionsPanelProps {
  moduleNode: UIPermissionNode;
  onSelect?: (key: string) => void;
  onAccessChange: (key: string, view: boolean, manage: boolean) => void;
}

export const TabsAndActionsPanel: React.FC<TabsAndActionsPanelProps> = ({ moduleNode, onSelect, onAccessChange }) => {
  // Track expanded tabs
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());

  const handleTabToggle = (tabKey: string) => {
    setExpandedTabs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tabKey)) {
        newSet.delete(tabKey);
      } else {
        newSet.add(tabKey);
      }
      return newSet;
    });
  };

  // Group children by type
  // Tabs are nested inside a tabs group node (key ends with '-tabs')
  // Actions can be module-level (direct children) or nested inside tabs/pages
  const childrenByType = useMemo(() => {
    if (!moduleNode.children || moduleNode.children.length === 0) {
      return { tabs: [], pages: [], actions: [] };
    }

    const tabs: UIPermissionNode[] = [];
    const pages: UIPermissionNode[] = [];
    const actions: UIPermissionNode[] = [];

    moduleNode.children.forEach((child) => {
      // Check if this is a tabs group node (key ends with '-tabs')
      if (child.key.endsWith('-tabs') && child.children) {
        // Extract actual tabs from the tabs group
        // All children of a tabs group node are tabs (they have isTab: true)
        child.children.forEach((tab) => {
          tabs.push(tab);
        });
      } else if (child.capabilities?.isTab === true) {
        // Direct tab (shouldn't happen in new structure, but handle it for edge cases)
        tabs.push(child);
      } else if (child.level === 'action') {
        // Module-level actions (direct children of module)
        actions.push(child);
      }
      // Skip regular pages - we only show tabs and actions in this panel
    });

    return { tabs, pages, actions };
  }, [moduleNode.children]);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ flex: 1, overflow: 'auto', pt: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Tabs - Always show section if tabs exist */}
        {childrenByType.tabs.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
              Tabs
            </Typography>
            <Stack spacing={1}>
              {childrenByType.tabs.map((tab) => {
                // Tabs inherit view/manage from parent module, but can be individually toggled
                // Check if tab has its own access state or inherits from parent
                const hasView = tab.access.view || tab.access.manage;
                const hasManage = tab.access.manage;
                const accessText = hasManage ? 'Manage' : hasView ? 'View' : 'Off';

                // Check if tab has nested actions
                const tabActions = tab.children?.filter((child) => child.level === 'action') || [];
                const hasTabActions = tabActions.length > 0;
                const isTabExpanded = expandedTabs.has(tab.key);

                // Handle tab click - cycle through Off -> View -> Manage -> Off
                // Similar to middle panel: click makes it view, another click selects all sub things, then another to off
                const handleTabClick = () => {
                  if (!tab.capabilities.supportsView && !tab.capabilities.supportsManage) return;

                  let nextView: boolean;
                  let nextManage: boolean;

                  // Cycle: Off -> View -> Manage -> Off (respecting capabilities)
                  if (!hasView && !hasManage) {
                    // First click: Off -> View
                    nextView = tab.capabilities.supportsView ? true : false;
                    nextManage = false;
                  } else if (hasView && !hasManage) {
                    // Second click: View -> Manage (enable manage and all sub actions)
                    nextView = tab.capabilities.supportsManage ? true : true; // Keep view if manage not supported
                    nextManage = tab.capabilities.supportsManage ? true : false;
                  } else {
                    // Third click: Manage -> Off
                    nextView = false;
                    nextManage = false;
                  }

                  // Update tab access first
                  onAccessChange(tab.key, nextView, nextManage);

                  // Handle child actions based on new tab state
                  if (hasTabActions && tabActions.length > 0) {
                    if (nextManage) {
                      // If manage is enabled, enable all child actions
                      tabActions.forEach((action) => {
                        if (action.capabilities.supportsManage) {
                          onAccessChange(action.key, false, true);
                        }
                      });
                    } else {
                      // If manage is disabled (view only or off), disable all child actions
                      tabActions.forEach((action) => {
                        if (action.capabilities.supportsManage && action.access.manage) {
                          onAccessChange(action.key, false, false);
                        }
                      });
                    }
                  }
                };

                return (
                  <Box key={tab.key} sx={{ mb: 1 }}>
                    <Box
                      onClick={handleTabClick}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: hasView ? 'action.selected' : 'background.paper',
                        border: '1.5px solid',
                        borderColor: hasView ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: 'primary.main',
                          transform: 'translateX(2px)'
                        }
                      }}
                    >
                      {/* Expand/Collapse button if tab has actions */}
                      {hasTabActions && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTabToggle(tab.key);
                          }}
                          sx={{ p: 0.5, ml: -0.5 }}
                        >
                          {isTabExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                        </IconButton>
                      )}

                      {/* Tab content */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {tab.label}
                          </Typography>
                          <Chip label="TAB" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {accessText}
                          </Typography>
                          {hasManage && (
                            <Tooltip title="Manage Access">
                              <EditIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            </Tooltip>
                          )}
                          {hasView && !hasManage && (
                            <Tooltip title="View Access">
                              <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Expandable actions list */}
                    {hasTabActions && (
                      <Collapse in={isTabExpanded} timeout="auto" unmountOnExit>
                        <List
                          component="div"
                          disablePadding
                          sx={{ mt: 0.5, ml: 2, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}
                        >
                          {tabActions.map((action) => {
                            const isEnabled = action.access.manage === true;
                            const isSecurityAction = action.key.includes('security') || action.key.includes('pin');
                            const iconConfig = getActionIcon(action.key);
                            const Icon = iconConfig?.icon && !isSecurityAction ? getIconComponent(iconConfig.icon) : null;

                            // Actions can only be enabled if parent tab has manage access
                            // If tab only has view or is off, actions should be disabled
                            const canToggleAction = hasManage; // Actions require parent tab to have manage access

                            return (
                              <ListItem key={action.key} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                  onClick={() => {
                                    // Only allow toggling if parent tab has manage access
                                    if (!canToggleAction) return;
                                    // Toggle action: Off -> Enabled -> Off
                                    const nextManage = !isEnabled;
                                    onAccessChange(action.key, false, nextManage);
                                  }}
                                  disabled={!canToggleAction}
                                  sx={{
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: isEnabled ? 'action.selected' : 'background.paper',
                                    border: '1px solid',
                                    borderColor: isEnabled ? 'primary.main' : 'divider',
                                    cursor: canToggleAction ? 'pointer' : 'not-allowed',
                                    opacity: canToggleAction ? 1 : 0.5,
                                    '&:hover': canToggleAction
                                      ? {
                                          bgcolor: 'action.hover',
                                          borderColor: 'primary.main'
                                        }
                                      : {},
                                    '&.Mui-disabled': {
                                      opacity: 0.5,
                                      cursor: 'not-allowed'
                                    }
                                  }}
                                >
                                  {/* Action icon */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                    {isSecurityAction ? (
                                      <LockIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                                    ) : Icon && iconConfig ? (
                                      <Icon
                                        size={16}
                                        style={{
                                          color:
                                            iconConfig.color === 'warning'
                                              ? '#ed6c02'
                                              : iconConfig.color === 'success'
                                                ? '#2e7d32'
                                                : undefined,
                                          flexShrink: 0
                                        }}
                                      />
                                    ) : (
                                      <Box sx={{ width: 16, height: 16, flexShrink: 0 }} />
                                    )}
                                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem', flex: 1, minWidth: 0 }}>
                                      {action.label}
                                    </Typography>
                                  </Box>
                                  {/* Enabled/Disabled icon */}
                                  {isEnabled ? (
                                    <CheckCircle sx={{ fontSize: 16, color: 'success.main', ml: 1, flexShrink: 0 }} />
                                  ) : (
                                    <Cancel sx={{ fontSize: 16, color: 'text.disabled', ml: 1, flexShrink: 0 }} />
                                  )}
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Actions - Always show section if actions exist */}
        {childrenByType.actions.length > 0 && (
          <Box sx={{ mt: childrenByType.tabs.length > 0 ? 2 : 0 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
              Actions
            </Typography>
            <Stack spacing={1}>
              {childrenByType.actions.map((action) => {
                const accessText = action.access.manage ? 'Manage' : action.access.view ? 'View' : 'Off';
                const isSecurityAction = action.key.includes('security') || action.key.includes('pin');
                // Use lock icon for security actions, otherwise use the configured icon
                const iconConfig = getActionIcon(action.key);
                const Icon = iconConfig?.icon && !isSecurityAction ? getIconComponent(iconConfig.icon) : null;
                return (
                  <Box
                    key={action.key}
                    onClick={() => onSelect?.(action.key)}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: action.access.view || action.access.manage ? 'action.selected' : 'background.paper',
                      border: '1.5px solid',
                      borderColor: action.access.view || action.access.manage ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.main',
                        transform: 'translateX(2px)'
                      }
                    }}
                  >
                    {/* Lock icon for security actions, otherwise use configured icon */}
                    {isSecurityAction ? (
                      <LockIcon
                        sx={{
                          fontSize: 18,
                          color: 'warning.main',
                          marginTop: 2
                        }}
                      />
                    ) : Icon && iconConfig ? (
                      <Icon
                        size={18}
                        style={{
                          color: iconConfig.color === 'warning' ? '#ed6c02' : iconConfig.color === 'success' ? '#2e7d32' : undefined,
                          marginTop: 2
                        }}
                      />
                    ) : null}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {action.label}
                        </Typography>
                        <Chip label="ACTION" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {accessText}
                        </Typography>
                        {/* Show icon based on access level */}
                        {action.access.manage && (
                          <Tooltip title="Manage Access">
                            <EditIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          </Tooltip>
                        )}
                        {action.access.view && !action.access.manage && (
                          <Tooltip title="View Access">
                            <VisibilityIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
