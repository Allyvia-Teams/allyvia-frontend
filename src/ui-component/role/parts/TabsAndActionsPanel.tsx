import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Chip,
  Typography,
  Box,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Cancel,
  SettingsOutlined
} from '@mui/icons-material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getActionIcon, getIconComponent } from 'utils/permission-icons';

interface TabsAndActionsPanelProps {
  moduleNode: UIPermissionNode;
  onSelect?: (key: string) => void;
  onAccessChange: (key: string, view: boolean, manage: boolean) => void;
}

export const TabsAndActionsPanel: React.FC<TabsAndActionsPanelProps> = ({ moduleNode, onSelect, onAccessChange }) => {
  // Track expanded items (tabs and pages)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleItemToggle = (itemKey: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Group children by type in hierarchical order
  // Hierarchy: Pages → Tabs → Module-level Actions
  // Pages can have actions, Tabs can have actions
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
      } else if (child.level === 'page') {
        // Regular pages - include them if they have actions or tabs
        // Pages are part of the hierarchical structure
        pages.push(child);
      } else if (child.level === 'action') {
        // Module-level actions (direct children of module)
        actions.push(child);
      }
    });

    return { tabs, pages, actions };
  }, [moduleNode.children]);

  // Check if there's any content to show
  const hasAnyContent = childrenByType.pages.length > 0 || childrenByType.tabs.length > 0 || childrenByType.actions.length > 0;

  // Check if this module is dashboard or settings (exclude from view switch)
  const moduleKey = moduleNode.key.toLowerCase();
  const isDashboardOrSettings = moduleKey === 'dashboard' || moduleKey === 'settings';

  // Get module access state
  const moduleHasView = moduleNode.access.view || moduleNode.access.manage;
  const moduleHasManage = moduleNode.access.manage;

  // Handle module view switch toggle (only for non-dashboard/settings modules)
  const handleModuleViewSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newView = event.target.checked;
    // If turning off view, also turn off manage
    const newManage = newView ? moduleHasManage : false;
    onAccessChange(moduleNode.key, newView, newManage);
  };

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ flex: 1, overflow: 'auto', pt: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Show "No Configuration" message if there's no content */}
        {!hasAnyContent && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              py: 6,
              px: 3
            }}
          >
            <SettingsOutlined sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
              No Configuration for this page
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7, mb: 3 }}>
              This page has no tabs or actions to configure
            </Typography>
            {/* View switch for module - only for non-dashboard/settings */}
            {!isDashboardOrSettings && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: moduleHasView ? 'action.selected' : 'background.paper',
                  border: '1.5px solid',
                  borderColor: moduleHasView ? 'primary.main' : 'divider',
                  minWidth: 300
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                  View Access
                </Typography>
                <FormControlLabel
                  control={<Switch checked={moduleHasView} onChange={handleModuleViewSwitch} size="medium" color="primary" />}
                  label=""
                  sx={{ m: 0 }}
                />
                {moduleHasManage && (
                  <Tooltip title="Manage Access">
                    <EditIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  </Tooltip>
                )}
                {moduleHasView && !moduleHasManage && (
                  <Tooltip title="View Access">
                    <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Pages - Show section if pages exist (hierarchical structure) */}
        {childrenByType.pages.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
              Pages
            </Typography>
            <Stack spacing={1}>
              {childrenByType.pages.map((page) => {
                // Pages inherit view/manage from parent module, but can be individually toggled
                const hasView = page.access.view || page.access.manage;
                const hasManage = page.access.manage;
                const accessText = hasManage ? 'Manage' : hasView ? 'View' : 'Off';

                // Check if page has nested actions
                const pageActions = page.children?.filter((child) => child.level === 'action') || [];
                const hasPageActions = pageActions.length > 0;
                const isPageExpanded = expandedItems.has(page.key);

                // Handle page click - cycle through Off -> View -> Manage -> Off
                const handlePageClick = () => {
                  if (!page.capabilities.supportsView && !page.capabilities.supportsManage) return;

                  let nextView: boolean;
                  let nextManage: boolean;

                  // Cycle: Off -> View -> Manage -> Off (respecting capabilities)
                  if (!hasView && !hasManage) {
                    // First click: Off -> View
                    nextView = page.capabilities.supportsView ? true : false;
                    nextManage = false;
                  } else if (hasView && !hasManage) {
                    // Second click: View -> Manage (enable manage and all sub actions)
                    nextView = page.capabilities.supportsManage ? true : true; // Keep view if manage not supported
                    nextManage = page.capabilities.supportsManage ? true : false;
                  } else {
                    // Third click: Manage -> Off
                    nextView = false;
                    nextManage = false;
                  }

                  // Update page access first
                  onAccessChange(page.key, nextView, nextManage);

                  // Handle child actions based on new page state
                  if (hasPageActions && pageActions.length > 0) {
                    if (nextManage) {
                      // If manage is enabled, enable all child actions
                      pageActions.forEach((action) => {
                        if (action.capabilities.supportsManage) {
                          onAccessChange(action.key, false, true);
                        }
                      });
                    } else {
                      // If manage is disabled (view only or off), disable all child actions
                      pageActions.forEach((action) => {
                        if (action.capabilities.supportsManage && action.access.manage) {
                          onAccessChange(action.key, false, false);
                        }
                      });
                    }
                  }
                };

                return (
                  <Box key={page.key} sx={{ mb: 1 }}>
                    <Box
                      onClick={handlePageClick}
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
                      {/* Expand/Collapse button if page has actions */}
                      {hasPageActions && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemToggle(page.key);
                          }}
                          sx={{ p: 0.5, ml: -0.5 }}
                        >
                          {isPageExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                        </IconButton>
                      )}

                      {/* Page content */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {page.label}
                          </Typography>
                          <Chip label="PAGE" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
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

                    {/* Expandable actions list for page */}
                    {hasPageActions && (
                      <Collapse in={isPageExpanded} timeout="auto" unmountOnExit>
                        <List
                          component="div"
                          disablePadding
                          sx={{ mt: 0.5, ml: 2, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}
                        >
                          {pageActions.map((action) => {
                            const isEnabled = action.access.manage === true;
                            const isSecurityAction = action.key.includes('security') || action.key.includes('pin');
                            const iconConfig = getActionIcon(action.key);
                            const Icon = iconConfig?.icon && !isSecurityAction ? getIconComponent(iconConfig.icon) : null;

                            // Actions can only be enabled if parent page has manage access
                            const canToggleAction = hasManage;

                            return (
                              <ListItem key={action.key} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                  onClick={() => {
                                    if (!canToggleAction) return;
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
                const hasAccess = hasView || hasManage;
                const accessText = hasManage ? 'Manage' : hasView ? 'View' : 'Off';

                // Check if tab has nested actions
                const tabActions = tab.children?.filter((child) => child.level === 'action') || [];
                const hasTabActions = tabActions.length > 0;
                const isTabExpanded = expandedItems.has(tab.key);

                // Handle tab click - cycle through Off -> View -> Manage -> Off
                // If manage is not supported, cycle is: Off -> View -> Off
                const handleTabClick = () => {
                  if (!tab.capabilities.supportsView && !tab.capabilities.supportsManage) return;

                  let nextView: boolean;
                  let nextManage: boolean;

                  // Cycle based on capabilities:
                  // If manage is supported: Off -> View -> Manage -> Off
                  // If manage is NOT supported: Off -> View -> Off
                  if (!hasView && !hasManage) {
                    // First click: Off -> View
                    nextView = tab.capabilities.supportsView ? true : false;
                    nextManage = false;
                  } else if (hasView && !hasManage) {
                    // Second click: View -> Manage (if supported) or View -> Off (if not supported)
                    if (tab.capabilities.supportsManage) {
                      // If manage is supported, go to Manage and enable all sub actions
                      nextView = true;
                      nextManage = true;
                    } else {
                      // If manage is NOT supported, go back to Off
                      nextView = false;
                      nextManage = false;
                    }
                  } else {
                    // Third click: Manage -> Off (only reached if manage is supported)
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
                        borderColor: hasView ? (hasManage ? 'success.main' : 'primary.main') : 'divider',
                        borderLeft: hasAccess ? '3px solid' : '1.5px solid',
                        borderLeftColor: hasAccess ? (hasManage ? 'success.main' : 'primary.main') : 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: hasAccess ? (hasManage ? 'success.main' : 'primary.main') : 'primary.main',
                          borderLeftColor: hasAccess ? (hasManage ? 'success.main' : 'primary.main') : 'primary.main',
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
                            handleItemToggle(tab.key);
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
          <Box sx={{ mt: childrenByType.tabs.length > 0 || childrenByType.pages.length > 0 ? 2 : 0 }}>
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
                const handleActionClick = () => {
                  if (!action.capabilities?.supportsManage) return;
                  const nextManage = !action.access.manage;
                  onAccessChange(action.key, false, nextManage);
                  onSelect?.(action.key);
                };
                return (
                  <Box
                    key={action.key}
                    onClick={handleActionClick}
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
