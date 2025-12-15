import React from 'react';
import { Box, Paper, Typography, List, ListItemButton, ListItemIcon } from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';
import { getModuleIcon, getPageIcon, getIconComponent } from 'utils/permission-icons';

interface NavigationPreviewProps {
  tree: UIPermissionNode[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

export const NavigationPreview: React.FC<NavigationPreviewProps> = ({ tree, selectedKey, onSelect }) => {
  // Render a permission node as a tree item
  const renderNode = (node: UIPermissionNode, level = 0): React.ReactNode => {
    // Skip actions and tabs in navigation preview - they should only appear on the right side
    if (node.level === 'action' || node.capabilities?.isTab === true) {
      return null;
    }

    // For modules: always show (so users can click to manage)
    // For pages: show if view or manage access is enabled
    if (node.level !== 'module') {
      if (!node.access.view && !node.access.manage) {
        return null;
      }
    }

    // Get icon for module or page
    const moduleIconConfig = node.level === 'module' ? getModuleIcon(node.key) : null;
    const pageIconConfig = node.level === 'page' ? getPageIcon(node.key) : null;
    const iconConfig = moduleIconConfig || pageIconConfig;
    const Icon = iconConfig?.icon ? getIconComponent(iconConfig.icon) : null;

    // Check for children: only include pages (not tabs or actions)
    const pages: UIPermissionNode[] = [];

    if (node.children) {
      for (const child of node.children) {
        // Skip tabs group nodes and tabs - they should only appear on the right side
        if (child.key.endsWith('-tabs') || child.capabilities?.isTab === true) {
          continue;
        }
        // Skip actions - they should only appear on the right side
        if (child.level === 'action') {
          continue;
        }
        // Only include pages
        if (child.level === 'page') {
          // For modules: show all pages (so users can see what's available)
          // For other nodes: only show pages with access
          if (node.level === 'module') {
            pages.push(child);
          } else if (child.access.view || child.access.manage) {
            pages.push(child);
          }
        }
      }
    }

    const hasChildren = pages.length > 0;
    const hasAccess = node.access.view || node.access.manage;

    if (node.level === 'module') {
      const isSelected = selectedKey === node.key;
      return (
        <Box key={node.key}>
          <ListItemButton
            onClick={() => onSelect?.(node.key)}
            sx={{
              pl: level === 0 ? 2 : 1.5 + level * 1.5,
              py: 0.75,
              minHeight: 40,
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              borderLeft: hasAccess ? '3px solid' : isSelected ? '3px solid' : 'none',
              borderColor: hasAccess ? 'success.main' : isSelected ? 'primary.main' : 'transparent',
              '&:hover': {
                bgcolor: isSelected ? 'action.selected' : 'action.hover',
                borderColor: hasAccess ? 'success.main' : isSelected ? 'primary.main' : 'primary.light'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {Icon && (
                <Icon
                  stroke={1.5}
                  size="20px"
                  style={{
                    color: hasAccess ? (iconConfig?.color === 'success' ? '#2e7d32' : undefined) : undefined
                  }}
                />
              )}
            </ListItemIcon>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
              {node.access.view && <Visibility sx={{ fontSize: 14, color: 'primary.main' }} />}
              {node.access.manage && <Edit sx={{ fontSize: 14, color: 'success.main' }} />}
            </Box>
          </ListItemButton>
          {hasChildren && (
            <List component="div" disablePadding>
              {pages.map((child) => renderNode(child, level + 1))}
            </List>
          )}
        </Box>
      );
    }

    if (node.level === 'page') {
      return (
        <Box key={node.key}>
          <ListItemButton
            sx={{
              pl: 1.5 + level * 1.5,
              py: 0.5,
              minHeight: 32,
              borderLeft: hasAccess ? '3px solid' : 'none',
              borderColor: hasAccess ? 'success.main' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: hasAccess ? 'success.main' : 'primary.light'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {Icon && (
                <Icon
                  stroke={1.5}
                  size="18px"
                  style={{
                    color: hasAccess ? (iconConfig?.color === 'success' ? '#2e7d32' : undefined) : undefined
                  }}
                />
              )}
            </ListItemIcon>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontSize: '0.813rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
              {node.access.view && <Visibility sx={{ fontSize: 12, color: 'primary.main' }} />}
              {node.access.manage && <Edit sx={{ fontSize: 12, color: 'success.main' }} />}
            </Box>
          </ListItemButton>
          {hasChildren && (
            <List component="div" disablePadding>
              {pages.map((child) => renderNode(child, level + 1))}
            </List>
          )}
        </Box>
      );
    }

    return null;
  };

  // Show all modules (so users can click any to manage), but only show enabled children
  const visibleNodes = tree;

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
          Modules
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Click a module to manage permissions
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
              No modules available
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
            {visibleNodes.length} {visibleNodes.length === 1 ? 'module available' : 'modules available'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
