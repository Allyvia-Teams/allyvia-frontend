import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Stack
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import type { UIPermissionNode } from 'utils/permissionNodeAdapter';

export interface TreeRow {
  key: string;
  label: string;
  level: 'module' | 'page' | 'action';
  depth: number;
  view: boolean;
  manage: boolean;
  caps: { view: boolean; manage: boolean; isTab?: boolean };
  expandable: boolean;
  expanded: boolean;
  node: UIPermissionNode;
}

interface RoleTreeProps {
  tree: UIPermissionNode[];
  selectedKey: string | null;
  expandedKeys: Record<string, boolean>;
  searchQuery: string;
  filter: 'all' | 'enabled' | 'manage' | 'actions';
  onSelect: (key: string) => void;
  onToggleExpand: (key: string) => void;
  onToggleAccess: (key: string) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: 'all' | 'enabled' | 'manage' | 'actions') => void;
  height?: number;
}

// Flatten tree to rows with access state
function buildFlatRows(
  nodes: UIPermissionNode[],
  expanded: Record<string, boolean>,
  parentKey: string | null = null,
  depth = 0,
  acc: TreeRow[] = []
): TreeRow[] {
  nodes.forEach((node) => {
    // Skip tabs: nodes with isTab flag or nodes that are the "Tabs" group (key ends with -tabs)
    // Skip actions: nodes with level === 'action'
    if (node.capabilities.isTab || node.key.endsWith('-tabs') || node.level === 'action') {
      return;
    }

    const hasChildren = !!(node.children && node.children.length > 0);
    const isExpanded = expanded[node.key] ?? false;

    // Filter children to exclude tabs and actions before checking if node has children
    const filteredChildren = node.children?.filter(
      (child) => !child.capabilities.isTab && !child.key.endsWith('-tabs') && child.level !== 'action'
    );
    const hasFilteredChildren = !!(filteredChildren && filteredChildren.length > 0);

    acc.push({
      key: node.key,
      label: node.label,
      level: node.level,
      depth,
      view: node.access.view,
      manage: node.access.manage,
      caps: {
        view: node.capabilities.supportsView,
        manage: node.capabilities.supportsManage,
        isTab: node.capabilities.isTab
      },
      expandable: hasFilteredChildren,
      expanded: isExpanded,
      node
    });

    // Only recurse into filtered children (excluding tabs and actions)
    if (hasFilteredChildren && isExpanded && filteredChildren) {
      buildFlatRows(filteredChildren, expanded, node.key, depth + 1, acc);
    }
  });

  return acc;
}

export const RoleTree: React.FC<RoleTreeProps> = ({
  tree,
  selectedKey,
  expandedKeys,
  searchQuery,
  filter,
  onSelect,
  onToggleExpand,
  onToggleAccess,
  onSearchChange,
  onFilterChange,
  height = 500
}) => {
  // Build flat rows
  const allRows = useMemo(() => buildFlatRows(tree, expandedKeys), [tree, expandedKeys]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let rows = allRows;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter((r) => r.label.toLowerCase().includes(query) || r.key.toLowerCase().includes(query));
    }

    // Type filter
    if (filter === 'enabled') {
      rows = rows.filter((r) => r.view || r.manage);
    } else if (filter === 'manage') {
      rows = rows.filter((r) => r.manage);
    } else if (filter === 'actions') {
      // Actions are now shown only in the right panel, so this filter won't match anything
      rows = [];
    }

    return rows;
  }, [allRows, searchQuery, filter]);

  // Handle checkbox click
  const handleCheckboxClick = useCallback(
    (key: string, currentView: boolean, currentManage: boolean, caps: { view: boolean; manage: boolean }) => {
      if (!caps.view && !caps.manage) return;
      onToggleAccess(key);
    },
    [onToggleAccess]
  );

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search and Filters */}
      <Box sx={{ p: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search modules, pages…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(e, newFilter) => {
              if (newFilter !== null) {
                onFilterChange(newFilter);
              }
            }}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="enabled">Enabled</ToggleButton>
            <ToggleButton value="manage">Manage</ToggleButton>
            <ToggleButton value="actions">Actions</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Tree List */}
      <Box sx={{ flex: 1, overflow: 'auto', scrollbarGutter: 'stable' }}>
        {filteredRows.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No items found
            </Typography>
          </Box>
        ) : (
          filteredRows.map((row) => {
            const checked = row.view || row.manage;
            const indeterminate = row.view && !row.manage;
            const manage = row.manage;
            const isSelected = selectedKey === row.key;

            return (
              <ListItemButton
                key={row.key}
                onClick={(e) => {
                  // If clicking on expand/collapse icon, don't toggle access
                  if ((e.target as HTMLElement).closest('[data-expand-button]')) {
                    return;
                  }
                  // Toggle access on row click
                  handleCheckboxClick(row.key, row.view, row.manage, row.caps);
                  // Also select the row
                  onSelect(row.key);
                }}
                selected={isSelected}
                dense
                sx={{
                  borderRadius: 1.5,
                  mx: 0.5,
                  my: 0.25,
                  pl: 1 + row.depth * 1.5,
                  minHeight: 40,
                  position: 'relative',
                  cursor: 'pointer',
                  '&::before': isSelected
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: 'primary.main',
                        opacity: 0.24,
                        borderRadius: '0 2px 2px 0'
                      }
                    : {},
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  },
                  '&:hover': {
                    bgcolor: isSelected ? 'action.selected' : 'action.hover'
                  }
                }}
              >
                {/* Expand/Collapse Icon */}
                {row.expandable && (
                  <Box
                    component="button"
                    data-expand-button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onToggleExpand(row.key);
                    }}
                    sx={{
                      mr: 0.5,
                      p: 0.5,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    {row.expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </Box>
                )}
                {!row.expandable && <Box sx={{ width: 32 }} />}

                {/* Checkbox - visual indicator only */}
                <Checkbox
                  size="small"
                  indeterminate={indeterminate}
                  checked={checked}
                  disabled={!row.caps.view && !row.caps.manage}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Same action as row click
                    handleCheckboxClick(row.key, row.view, row.manage, row.caps);
                    onSelect(row.key);
                  }}
                  sx={{ p: 0.5, mr: 1, pointerEvents: 'auto' }}
                />

                {/* Label */}
                <ListItemText
                  primary={row.label}
                  primaryTypographyProps={{
                    fontWeight: row.level === 'module' ? 600 : 500,
                    fontSize: 14,
                    color: isSelected ? 'primary.main' : 'text.primary'
                  }}
                  sx={{ mr: 1, flex: 1 }}
                />

                {/* Permission Icons */}
                <Stack direction="row" spacing={0.5} sx={{ mr: 1, alignItems: 'center' }}>
                  {checked && (
                    <>
                      {/* Show eye icon for view access (always show if checked, since view is implied by manage) */}
                      <Tooltip title="View Access">
                        <VisibilityIcon
                          sx={{
                            fontSize: 18,
                            color: 'text.secondary',
                            opacity: 0.7
                          }}
                        />
                      </Tooltip>
                      {/* Show edit icon for manage access */}
                      {manage && (
                        <Tooltip title="Manage Access">
                          <EditIcon
                            sx={{
                              fontSize: 18,
                              color: 'text.secondary',
                              opacity: 0.7
                            }}
                          />
                        </Tooltip>
                      )}
                    </>
                  )}
                  {/* Show lock icon for security-related actions */}
                  {row.level === 'action' && row.key.includes('security') && (
                    <Tooltip title="Security Action">
                      <LockIcon
                        sx={{
                          fontSize: 18,
                          color: 'text.secondary',
                          opacity: 0.7
                        }}
                      />
                    </Tooltip>
                  )}
                </Stack>
              </ListItemButton>
            );
          })
        )}
      </Box>
    </Box>
  );
};
