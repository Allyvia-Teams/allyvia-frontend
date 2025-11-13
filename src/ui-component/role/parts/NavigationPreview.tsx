import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemButton, ListItemText, Collapse, Chip } from '@mui/material';
import { ExpandLess, ExpandMore, Visibility, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getActionIcon, getIconComponent } from 'utils/permission-icons';
import { Lock as LockIcon } from '@mui/icons-material';

interface NavigationPreviewProps {
  tree: UIPermissionNode[];
}

export const NavigationPreview: React.FC<NavigationPreviewProps> = ({ tree }) => {
  // Track expanded items
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(() => {
    const expanded = new Set<string>();
    // Expand all modules by default
    tree.forEach((node) => {
      if (node.access.view || node.access.manage) {
        expanded.add(node.key);
      }
    });
    return expanded;
  });

  const handleToggle = (key: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Render a permission node as a tree item
  const renderNode = (node: UIPermissionNode, level = 0): React.ReactNode => {
    // For actions: only show if manage access is enabled
    if (node.level === 'action') {
      if (!node.access.manage) {
        return null;
      }
      // Actions don't have children, so render them directly
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
            <Typography
              variant="caption"
              sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {node.label}
            </Typography>
            {node.access.manage && <Edit sx={{ fontSize: 12, color: 'success.main', ml: 'auto', flexShrink: 0 }} />}
          </ListItemButton>
        </ListItem>
      );
    }

    // For modules and pages: show if view or manage access is enabled
    // Exception: tabs with actions should be shown even if they don't have access
    const isTabCheck = node.capabilities?.isTab === true;
    const hasTabActionsCheck = isTabCheck && node.children && node.children.some((c) => c.level === 'action');
    if (!node.access.view && !node.access.manage && !hasTabActionsCheck) {
      return null;
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
          // Add the tab children directly (skip the group node)
          // Include tabs that have view/manage access OR have actions
          child.children.forEach((tabChild) => {
            const hasAccess = tabChild.access.view || tabChild.access.manage;
            const hasActions = tabChild.children && tabChild.children.some((c) => c.level === 'action');
            if (hasAccess || hasActions) {
              tabs.push(tabChild);
            }
          });
        } else if (child.level === 'action') {
          // Module-level actions: show if manage is enabled
          if (child.access.manage === true) {
            moduleActions.push(child);
          }
        } else if (child.level === 'page') {
          // Pages: show if view or manage is enabled
          if (child.access.view || child.access.manage) {
            pages.push(child);
          }
        }
      }
    }

    // Combine in order: pages, tabs, then module-level actions
    const visibleChildren = [...pages, ...tabs, ...moduleActions];

    const hasChildren = visibleChildren && visibleChildren.length > 0;
    const isExpanded = expandedItems.has(node.key);

    if (node.level === 'module') {
      return (
        <Box key={node.key}>
          <ListItemButton
            onClick={() => handleToggle(node.key)}
            sx={{
              pl: 1.5 + level * 1.5,
              py: 0.75,
              minHeight: 32,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.813rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
                {node.access.view && <Visibility sx={{ fontSize: 14, color: 'primary.main' }} />}
                {node.access.manage && <Edit sx={{ fontSize: 14, color: 'success.main' }} />}
              </Box>
            </Box>
            {hasChildren && (isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />)}
          </ListItemButton>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {visibleChildren?.map((child) => renderNode(child, level + 1))}
              </List>
            </Collapse>
          )}
        </Box>
      );
    }

    if (node.level === 'page') {
      // Check if this is a tab (has isTab flag)
      const isTab = node.capabilities?.isTab === true;
      // Get tab actions if any
      const tabActions = node.children?.filter((child) => child.level === 'action') || [];
      const hasTabActions = tabActions.length > 0;
      const hasAccess = node.access.view || node.access.manage;

      return (
        <Box key={node.key}>
          <ListItemButton
            onClick={hasChildren ? () => handleToggle(node.key) : undefined}
            sx={{
              pl: 1.5 + level * 1.5,
              py: 0.5,
              minHeight: 28,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              {isTab && <Chip label="TAB" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, mr: 0.5 }} />}
              <Typography variant="body2" sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
                {node.access.view && <Visibility sx={{ fontSize: 12, color: 'primary.main' }} />}
                {node.access.manage && <Edit sx={{ fontSize: 12, color: 'success.main' }} />}
              </Box>
            </Box>
            {hasChildren && (isExpanded ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />)}
          </ListItemButton>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {/* For tabs with actions: show actions as a list */}
                {isTab && hasTabActions
                  ? tabActions.map((action) => {
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
                                    color:
                                      iconConfig.color === 'warning' ? '#ed6c02' : iconConfig.color === 'success' ? '#2e7d32' : undefined,
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
                    })
                  : // For regular pages: render children normally
                    visibleChildren?.map((child) => renderNode(child, level + 1))}
              </List>
            </Collapse>
          )}
        </Box>
      );
    }

    return null;
  };

  // Filter tree to only show nodes with view or manage access
  // Exception: tabs with actions should be shown even if they don't have access
  const visibleNodes = tree.filter((node) => {
    const hasAccess = node.access.view || node.access.manage;
    const isTab = node.capabilities?.isTab === true;
    const hasTabActions = isTab && node.children && node.children.some((c) => c.level === 'action');
    return hasAccess || hasTabActions;
  });

  return (
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
        <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
          Preview
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Enabled permissions
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          scrollbarGutter: 'stable'
        }}
      >
        {visibleNodes.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              No permissions enabled
            </Typography>
          </Box>
        ) : (
          <List component="nav" disablePadding>
            {visibleNodes.map((node) => renderNode(node))}
          </List>
        )}
      </Box>

      {visibleNodes.length > 0 && (
        <Box
          sx={{
            p: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {visibleNodes.length} {visibleNodes.length === 1 ? 'module' : 'modules'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
