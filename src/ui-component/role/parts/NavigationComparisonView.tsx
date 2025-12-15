import React, { useMemo } from 'react';
import { Box, Paper, Typography, Grid, Chip, List, ListItem, ListItemButton } from '@mui/material';
import { Visibility, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { IconX } from '@tabler/icons-react';
import { Lock as LockIcon } from '@mui/icons-material';
import type { RoleComparison, Permission, AvailableModule } from 'types/role';
import { availableModulesToUITree, type UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getIconComponent, getActionIcon } from 'utils/permission-icons';

interface NavigationComparisonViewProps {
  comparison: RoleComparison;
  availableModules: AvailableModule[] | null;
  currentPermissions: Permission[] | null;
}

export const NavigationComparisonView: React.FC<NavigationComparisonViewProps> = ({ comparison, availableModules, currentPermissions }) => {
  // Build permission maps for easy lookup
  const currentPermMap = useMemo(() => {
    const map = new Map<string, Permission>();
    if (currentPermissions) {
      currentPermissions.forEach((p) => map.set(p.key.toLowerCase(), p));
    }
    // Also add from comparison differences
    comparison.differences.lost.forEach((p) => map.set(p.key.toLowerCase(), p));
    comparison.differences.changed.forEach((c) => map.set(c.key.toLowerCase(), c.current));
    return map;
  }, [currentPermissions, comparison]);

  const newPermMap = useMemo(() => {
    const map = new Map<string, Permission>();
    comparison.differences.gained.forEach((p) => map.set(p.key.toLowerCase(), p));
    comparison.differences.changed.forEach((c) => map.set(c.key.toLowerCase(), c.new));
    return map;
  }, [comparison]);

  // Build base tree from available modules
  const baseTree = useMemo(() => {
    if (!availableModules || availableModules.length === 0) return [];
    return availableModulesToUITree(availableModules);
  }, [availableModules]);

  // Helper to recursively merge permissions into tree
  const mergePermissionsIntoTree = React.useCallback((node: UIPermissionNode, perm: Permission | null): UIPermissionNode => {
    const merged: UIPermissionNode = {
      ...node,
      access: perm ? { view: perm.view || false, manage: perm.manage || false } : { view: false, manage: false }
    };

    if (!node.children || node.children.length === 0) {
      return merged;
    }

    // Process children based on node type
    const mergedChildren: UIPermissionNode[] = [];

    for (const child of node.children) {
      if (child.key.endsWith('-tabs') && child.children) {
        // Tabs group node - process tabs
        const mergedTabs = child.children.map((tab) => {
          // Find tab permission
          const tabPerm = perm?.tabs?.find((t) => t.key.toLowerCase() === tab.key.toLowerCase());
          const mergedTab: UIPermissionNode = {
            ...tab,
            access: perm ? { view: perm.view || false, manage: perm.manage || false } : { view: false, manage: false }
          };
          // Merge tab actions
          if (tab.children && tabPerm?.actions) {
            mergedTab.children = tab.children.map((action) => {
              const actionPerm = tabPerm.actions?.find((a) => a.key.toLowerCase() === action.key.toLowerCase());
              return {
                ...action,
                access: { view: false, manage: actionPerm?.value === true || false }
              };
            });
          }
          return mergedTab;
        });
        mergedChildren.push({
          ...child,
          children: mergedTabs
        });
      } else if (child.level === 'page') {
        // Page node - find page permission
        const pagePerm = perm?.pages?.find((p) => p.key.toLowerCase() === child.key.toLowerCase());
        const mergedPage: UIPermissionNode = {
          ...child,
          access: perm ? { view: perm.view || false, manage: perm.manage || false } : { view: false, manage: false }
        };
        // Merge page actions
        if (child.children && pagePerm?.actions) {
          mergedPage.children = child.children.map((action) => {
            const actionPerm = pagePerm.actions?.find((a) => a.key.toLowerCase() === action.key.toLowerCase());
            return {
              ...action,
              access: { view: false, manage: actionPerm?.value === true || false }
            };
          });
        }
        mergedChildren.push(mergedPage);
      } else if (child.level === 'action') {
        // Module-level action
        const actionPerm = perm?.actions?.find((a) => a.key.toLowerCase() === child.key.toLowerCase());
        mergedChildren.push({
          ...child,
          access: { view: false, manage: actionPerm?.value === true || false }
        });
      } else {
        mergedChildren.push(child);
      }
    }

    merged.children = mergedChildren;
    return merged;
  }, []);

  // Build current role tree
  const currentTree = useMemo(() => {
    if (!baseTree.length) return [];
    return baseTree.map((module) => {
      const perm = currentPermMap.get(module.key);
      return mergePermissionsIntoTree(module, perm || null);
    });
  }, [baseTree, currentPermMap]);

  // Build new role tree
  const newTree = useMemo(() => {
    if (!baseTree.length) return [];
    return baseTree.map((module) => {
      // Check new permissions first, then fall back to current if unchanged
      let perm = newPermMap.get(module.key);
      if (!perm) {
        const currentPerm = currentPermMap.get(module.key);
        if (currentPerm && !comparison.differences.lost.some((l) => l.key === module.key)) {
          // Module exists in current and not lost, so it's unchanged
          perm = currentPerm;
        }
      }
      return mergePermissionsIntoTree(module, perm || null);
    });
  }, [baseTree, newPermMap, currentPermMap, comparison]);

  // Check if a module has differences
  const getModuleDiffStatus = (moduleKey: string): 'gained' | 'lost' | 'changed' | 'unchanged' => {
    if (comparison.differences.gained.some((g) => g.key === moduleKey)) return 'gained';
    if (comparison.differences.lost.some((l) => l.key === moduleKey)) return 'lost';
    if (comparison.differences.changed.some((c) => c.key === moduleKey)) return 'changed';
    return 'unchanged';
  };

  // Render a permission node as a tree item (matching NavigationPreview structure)
  const renderNode = (node: UIPermissionNode, level = 0, isNewRole = false): React.ReactNode => {
    const diffStatus = getModuleDiffStatus(node.key);
    const hasView = node.access.view || node.access.manage;
    const hasManage = node.access.manage;

    // For actions: only show if manage access is enabled
    if (node.level === 'action') {
      if (!hasManage) {
        return null;
      }
      // Actions don't have children, so render them directly
      const isSecurityAction = node.key.includes('security') || node.key.includes('pin');
      const iconConfig = getActionIcon(node.key);
      const Icon = iconConfig?.icon && !isSecurityAction ? getIconComponent(iconConfig.icon) : null;

      return (
        <ListItem
          key={node.key}
          disablePadding
          sx={{
            pl: 1.5 + level * 1.5,
            py: 0.25
          }}
        >
          <ListItemButton
            disabled
            sx={{
              minHeight: 24,
              borderRadius: 0.5,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
              {isSecurityAction ? (
                <LockIcon sx={{ fontSize: 14, color: 'warning.main', flexShrink: 0 }} />
              ) : Icon && iconConfig ? (
                <Icon
                  size={14}
                  style={{
                    color: iconConfig.color === 'warning' ? '#ed6c02' : iconConfig.color === 'success' ? '#2e7d32' : undefined,
                    flexShrink: 0
                  }}
                />
              ) : (
                <Box sx={{ width: 14, height: 14, flexShrink: 0 }} />
              )}
              <Typography
                variant="caption"
                sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}
              >
                {node.label}
              </Typography>
            </Box>
            {/* Enabled/Disabled icon */}
            {hasManage ? (
              <CheckCircle sx={{ fontSize: 12, color: 'success.main', ml: 'auto', flexShrink: 0 }} />
            ) : (
              <Cancel sx={{ fontSize: 12, color: 'text.disabled', ml: 'auto', flexShrink: 0 }} />
            )}
          </ListItemButton>
        </ListItem>
      );
    }

    // For modules: always show (so users can see what's available)
    // For pages/tabs: show if view or manage access is enabled
    // Exception: tabs with actions should be shown even if they don't have access
    const isTabCheck = node.capabilities?.isTab === true;
    const hasTabActionsCheck = isTabCheck && node.children && node.children.some((c) => c.level === 'action');

    // Always show modules, but filter pages/tabs based on access
    if (node.level !== 'module') {
      if (!hasView && !hasManage && !hasTabActionsCheck) {
        return null;
      }
    }

    // Check for children: include actions, pages, and tabs
    // Handle tabs group node: expand it and include its children (actual tabs) directly
    // Maintain order: pages first, then tabs, then module-level actions
    const pages: UIPermissionNode[] = [];
    const tabs: UIPermissionNode[] = [];
    const moduleActions: UIPermissionNode[] = [];

    if (node.children) {
      for (const child of node.children) {
        // If this is a tabs group node, expand it and include its children (actual tabs)
        if (child.key.endsWith('-tabs') && child.children) {
          // For modules: show all tabs (so users can see what's available)
          // For other nodes: only show tabs with access or actions
          if (node.level === 'module') {
            child.children.forEach((tabChild) => {
              tabs.push(tabChild);
            });
          } else {
            child.children.forEach((tabChild) => {
              const hasAccess = tabChild.access.view || tabChild.access.manage;
              const hasActions = tabChild.children && tabChild.children.some((c) => c.level === 'action');
              if (hasAccess || hasActions) {
                tabs.push(tabChild);
              }
            });
          }
        } else if (child.level === 'action') {
          // For modules: show all actions (so users can see what's available)
          // For other nodes: only show actions with manage enabled
          if (node.level === 'module') {
            moduleActions.push(child);
          } else if (child.access.manage === true) {
            moduleActions.push(child);
          }
        } else {
          // For modules: show ALL children (pages or anything else) so users can see what's available
          // For other nodes: only show pages with access
          if (node.level === 'module') {
            // All non-action, non-tabs-group children go to pages
            pages.push(child);
          } else if (child.level === 'page' && (child.access.view || child.access.manage)) {
            pages.push(child);
          }
        }
      }
    }

    // Combine in order: pages, tabs, then module-level actions
    const visibleChildren = [...pages, ...tabs, ...moduleActions];

    const hasChildren = visibleChildren && visibleChildren.length > 0;

    // Determine border color based on diff status (only for modules)
    const getBorderColor = () => {
      if (node.level !== 'module') return 'transparent';
      if (diffStatus === 'gained') return 'success.main';
      if (diffStatus === 'lost') return 'error.main';
      if (diffStatus === 'changed') return 'warning.main';
      return 'transparent';
    };

    const getBgColor = () => {
      if (node.level !== 'module') return 'transparent';
      if (diffStatus === 'gained') return 'success.lighter';
      if (diffStatus === 'lost') return 'error.lighter';
      if (diffStatus === 'changed') return 'warning.lighter';
      return 'transparent';
    };

    if (node.level === 'module') {
      return (
        <Box key={node.key}>
          <ListItemButton
            disabled
            sx={{
              pl: 1.5 + level * 1.5,
              py: 0.75,
              minHeight: 32,
              bgcolor: getBgColor(),
              borderLeft: '3px solid',
              borderColor: getBorderColor(),
              '&:hover': {
                bgcolor: getBgColor() !== 'transparent' ? getBgColor() : 'action.hover'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.813rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
                {hasView && <Visibility sx={{ fontSize: 14, color: 'primary.main' }} />}
                {hasManage && <Edit sx={{ fontSize: 14, color: 'success.main' }} />}
                {!hasView && !hasManage && <IconX size={14} color="#999" />}
              </Box>
              {diffStatus !== 'unchanged' && (
                <Chip
                  label={diffStatus === 'gained' ? '+' : diffStatus === 'lost' ? '-' : '~'}
                  size="small"
                  color={diffStatus === 'gained' ? 'success' : diffStatus === 'lost' ? 'error' : 'warning'}
                  sx={{ height: 18, fontSize: '0.65rem', minWidth: 20, ml: 0.5 }}
                />
              )}
            </Box>
          </ListItemButton>
          {hasChildren && (
            <List component="div" disablePadding>
              {visibleChildren?.map((child) => renderNode(child, level + 1, isNewRole))}
            </List>
          )}
        </Box>
      );
    }

    if (node.level === 'page') {
      // Check if this is a tab (has isTab flag)
      const isTab = node.capabilities?.isTab === true;
      // Get page/tab actions if any (actions are direct children)
      const pageActions = node.children?.filter((child) => child.level === 'action') || [];
      const hasPageActions = pageActions.length > 0;
      // Check if page/tab has access (for showing green border)
      const hasAccess = hasView || hasManage;

      return (
        <Box key={node.key}>
          <ListItemButton
            sx={{
              pl: 1.5 + level * 1.5,
              py: 0.5,
              minHeight: 28,
              borderLeft: hasAccess ? '3px solid' : 'none',
              borderColor: hasAccess ? 'success.light' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: hasAccess ? 'success.main' : 'transparent'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              {isTab && <Chip label="TAB" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, mr: 0.5 }} />}
              <Typography variant="body2" sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
                {hasView && <Visibility sx={{ fontSize: 12, color: 'primary.main' }} />}
                {hasManage && <Edit sx={{ fontSize: 12, color: 'success.main' }} />}
              </Box>
            </Box>
          </ListItemButton>
          {(hasPageActions || hasChildren) && (
            <List component="div" disablePadding>
              {/* For pages/tabs with actions: show actions as a list */}
              {hasPageActions &&
                pageActions.map((action) => {
                  const isEnabled = action.access.manage === true;
                  const isSecurityAction = action.key.includes('security') || action.key.includes('pin');
                  const iconConfig = getActionIcon(action.key);
                  const Icon = iconConfig?.icon && !isSecurityAction ? getIconComponent(iconConfig.icon) : null;

                  return (
                    <ListItem
                      key={action.key}
                      disablePadding
                      sx={{
                        pl: 1.5 + (level + 1) * 1.5,
                        py: 0.25
                      }}
                    >
                      <ListItemButton
                        sx={{
                          minHeight: 24,
                          borderRadius: 0.5,
                          borderLeft: isEnabled ? '2px solid' : 'none',
                          borderColor: isEnabled ? 'success.light' : 'transparent',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: isEnabled ? 'success.main' : 'transparent'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                          {isSecurityAction ? (
                            <LockIcon sx={{ fontSize: 14, color: 'warning.main', flexShrink: 0 }} />
                          ) : Icon && iconConfig ? (
                            <Icon
                              size={14}
                              style={{
                                color: iconConfig.color === 'warning' ? '#ed6c02' : iconConfig.color === 'success' ? '#2e7d32' : undefined,
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <Box sx={{ width: 14, height: 14, flexShrink: 0 }} />
                          )}
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}
                          >
                            {action.label}
                          </Typography>
                        </Box>
                        {/* Enabled/Disabled icon */}
                        {isEnabled ? (
                          <CheckCircle sx={{ fontSize: 12, color: 'success.main', ml: 'auto', flexShrink: 0 }} />
                        ) : (
                          <Cancel sx={{ fontSize: 12, color: 'text.disabled', ml: 'auto', flexShrink: 0 }} />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              {/* For nested pages: render children normally */}
              {visibleChildren && visibleChildren.length > 0 && visibleChildren.map((child) => renderNode(child, level + 1, isNewRole))}
            </List>
          )}
        </Box>
      );
    }

    return null;
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Modules Gained
            </Typography>
            <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
              {comparison.summary.modules_gained}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Modules Lost
            </Typography>
            <Typography variant="h5" color="error.main" sx={{ fontWeight: 600 }}>
              {comparison.summary.modules_lost}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Modules Changed
            </Typography>
            <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600 }}>
              {comparison.summary.modules_changed}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Side-by-Side Navigation Preview */}
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Navigation Comparison
      </Typography>

      <Grid container spacing={2}>
        {/* Current Role Navigation */}
        <Grid size={{ xs: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              height: 600,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Current Role
                </Typography>
                <Chip label={comparison.current_role.role_display} size="small" color="default" />
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                scrollbarGutter: 'stable'
              }}
            >
              {currentTree.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No modules available
                  </Typography>
                </Box>
              ) : (
                <List component="nav" disablePadding>
                  {currentTree.map((node) => renderNode(node, 0, false))}
                </List>
              )}
            </Box>
            {currentTree.length > 0 && (
              <Box
                sx={{
                  p: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50'
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {currentTree.length} {currentTree.length === 1 ? 'module available' : 'modules available'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* New Role Navigation */}
        <Grid size={{ xs: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              height: 600,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  New Role
                </Typography>
                <Chip label={comparison.new_role.role_display} size="small" color="primary" />
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                scrollbarGutter: 'stable'
              }}
            >
              {newTree.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    No modules available
                  </Typography>
                </Box>
              ) : (
                <List component="nav" disablePadding>
                  {newTree.map((node) => renderNode(node, 0, true))}
                </List>
              )}
            </Box>
            {newTree.length > 0 && (
              <Box
                sx={{
                  p: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50'
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {newTree.length} {newTree.length === 1 ? 'module available' : 'modules available'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Legend */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          Legend:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="+" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', minWidth: 20 }} />
            <Typography variant="caption">Gained</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="-" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', minWidth: 20 }} />
            <Typography variant="caption">Lost</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="~" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem', minWidth: 20 }} />
            <Typography variant="caption">Changed</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Visibility sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography variant="caption">View Access</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Edit sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="caption">Manage Access</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
