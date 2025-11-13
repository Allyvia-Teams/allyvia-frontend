import React from 'react';
import { Card, CardContent, CardHeader, Stack, Chip, Typography, Divider, Box } from '@mui/material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getActionIcon, getIconComponent } from 'utils/permission-icons';

interface NodeInspectorProps {
  selectedKey: string | null;
  node: UIPermissionNode | null;
  onAccessChange: (key: string, view: boolean, manage: boolean) => void;
  onSelect?: (key: string) => void;
  showTabsAndActions?: boolean; // If false, hide tabs and actions from this component
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ selectedKey, node, onAccessChange, onSelect, showTabsAndActions = true }) => {
  // Get icon for actions
  const actionIconConfig = node && node.level === 'action' ? getActionIcon(node.key) : null;
  const ActionIcon = actionIconConfig?.icon ? getIconComponent(actionIconConfig.icon) : null;

  // Group children by type
  const childrenByType = React.useMemo(() => {
    if (!node?.children) return { tabs: [], pages: [], actions: [] };

    const tabs: UIPermissionNode[] = [];
    const pages: UIPermissionNode[] = [];
    const actions: UIPermissionNode[] = [];

    node.children.forEach((child) => {
      if (child.capabilities.isTab) {
        tabs.push(child);
      } else if (child.level === 'action') {
        actions.push(child);
      } else {
        pages.push(child);
      }
    });

    return { tabs, pages, actions };
  }, [node?.children]);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
      {!selectedKey || !node ? (
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Select a module, page, or action to edit permissions.
          </Typography>
        </CardContent>
      ) : (
        <>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {ActionIcon && <ActionIcon size={20} style={{ color: actionIconConfig?.color === 'warning' ? '#ed6c02' : undefined }} />}
                <Typography variant="h6" component="span">
                  {node.label}
                </Typography>
              </Box>
            }
            subheader={
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip label={node.level.toUpperCase()} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                {node.capabilities.isTab && (
                  <Chip label="TAB" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                )}
                {node.level === 'action' && (
                  <Chip label="ACTION" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                )}
              </Stack>
            }
          />
          <Divider />

          <CardContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', pt: 2 }}>
            {/* Pages (only show pages if showTabsAndActions is true, otherwise tabs/actions are shown separately) */}
            {showTabsAndActions && childrenByType.pages.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    Pages
                  </Typography>
                  <Stack spacing={1}>
                    {childrenByType.pages.map((page) => {
                      const accessText = page.access.manage ? 'Manage' : page.access.view ? 'View' : 'Off';
                      return (
                        <Box
                          key={page.key}
                          onClick={() => onSelect?.(page.key)}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: page.access.view || page.access.manage ? 'action.selected' : 'transparent',
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {page.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {accessText}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            )}

            {/* Tabs and Actions - only show if showTabsAndActions is true */}
            {showTabsAndActions && (childrenByType.tabs.length > 0 || childrenByType.actions.length > 0) && (
              <>
                {childrenByType.pages.length > 0 && <Divider sx={{ my: 2 }} />}

                {/* Tabs */}
                {childrenByType.tabs.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                      Tabs
                    </Typography>
                    <Stack spacing={1}>
                      {childrenByType.tabs.map((tab) => {
                        const accessText = tab.access.manage ? 'Manage' : tab.access.view ? 'View' : 'Off';
                        return (
                          <Box
                            key={tab.key}
                            onClick={() => onSelect?.(tab.key)}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: tab.access.view || tab.access.manage ? 'action.selected' : 'transparent',
                              border: '1px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {tab.label}
                              </Typography>
                              <Chip label="TAB" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {accessText}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {/* Actions */}
                {childrenByType.actions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                      Actions
                    </Typography>
                    <Stack spacing={1}>
                      {childrenByType.actions.map((action) => {
                        const accessText = action.access.manage ? 'Manage' : action.access.view ? 'View' : 'Off';
                        const iconConfig = getActionIcon(action.key);
                        const Icon = iconConfig?.icon ? getIconComponent(iconConfig.icon) : null;
                        return (
                          <Box
                            key={action.key}
                            onClick={() => onSelect?.(action.key)}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: action.access.view || action.access.manage ? 'action.selected' : 'transparent',
                              border: '1px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            {Icon && iconConfig && (
                              <Icon
                                size={18}
                                style={{
                                  color: iconConfig.color === 'warning' ? '#ed6c02' : iconConfig.color === 'success' ? '#2e7d32' : undefined
                                }}
                              />
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {action.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {accessText}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};
