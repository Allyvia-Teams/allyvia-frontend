import React from 'react';
import { Box, Paper, Typography, Grid, Chip, Stack } from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import { IconX } from '@tabler/icons-react';
import type { RoleComparison, Permission } from 'types/role';
import { getModuleDisplayName } from 'registry/builders';
import { getModuleIcon, getIconComponent } from 'utils/permission-icons';

interface RoleComparisonViewProps {
  comparison: RoleComparison;
}

export const RoleComparisonView: React.FC<RoleComparisonViewProps> = ({ comparison }) => {
  // Build a map of all modules (current + new) for comparison
  const allModuleKeys = new Set<string>();
  comparison.differences.gained.forEach((p) => allModuleKeys.add(p.key));
  comparison.differences.lost.forEach((p) => allModuleKeys.add(p.key));
  comparison.differences.changed.forEach((c) => allModuleKeys.add(c.key));

  // Build permission maps for easy lookup
  const currentPermMap = new Map<string, Permission>();
  const newPermMap = new Map<string, Permission>();

  // Add lost permissions (these exist in current but not in new)
  comparison.differences.lost.forEach((p) => {
    currentPermMap.set(p.key, p);
  });

  // Add gained permissions (these exist in new but not in current)
  comparison.differences.gained.forEach((p) => {
    newPermMap.set(p.key, p);
  });

  // Add changed permissions
  comparison.differences.changed.forEach((c) => {
    currentPermMap.set(c.key, c.current);
    newPermMap.set(c.key, c.new);
  });

  const getCurrentPermission = (moduleKey: string): Permission | null => {
    return currentPermMap.get(moduleKey) || null;
  };

  const getNewPermission = (moduleKey: string): Permission | null => {
    return newPermMap.get(moduleKey) || null;
  };

  const getStatusIcon = (perm: Permission | null, isNew: boolean) => {
    if (!perm) return null;
    if (perm.view || perm.manage) {
      return perm.manage ? (
        <Edit sx={{ fontSize: 14, color: 'success.main' }} />
      ) : (
        <Visibility sx={{ fontSize: 14, color: 'primary.main' }} />
      );
    }
    return <IconX size={14} color="#999" />;
  };

  const getStatusText = (perm: Permission | null) => {
    if (!perm) return 'No Access';
    if (perm.manage) return 'Manage';
    if (perm.view) return 'View';
    return 'No Access';
  };

  const getStatusColor = (perm: Permission | null) => {
    if (!perm) return 'default';
    if (perm.manage) return 'success';
    if (perm.view) return 'primary';
    return 'default';
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

      {/* Side-by-Side Comparison */}
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Permission Comparison
      </Typography>

      <Grid container spacing={2}>
        {/* Current Role */}
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Current Role
              </Typography>
              <Chip label={comparison.current_role.role_display} size="small" color="default" />
            </Box>
            <Stack spacing={1}>
              {Array.from(allModuleKeys).map((moduleKey) => {
                const currentPerm = getCurrentPermission(moduleKey);
                const isLost = comparison.differences.lost.some((l) => l.key === moduleKey);
                const isChanged = comparison.differences.changed.some((c) => c.key === moduleKey);

                const moduleIconConfig = getModuleIcon(moduleKey);
                const ModuleIcon = moduleIconConfig?.icon ? getIconComponent(moduleIconConfig.icon) : null;

                return (
                  <Box
                    key={moduleKey}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: isLost ? 'error.main' : isChanged ? 'warning.main' : 'divider',
                      bgcolor: isLost ? 'error.lighter' : isChanged ? 'warning.lighter' : 'background.paper'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {ModuleIcon && <ModuleIcon size={18} style={{ flexShrink: 0 }} />}
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                        {getModuleDisplayName(moduleKey)}
                      </Typography>
                      {getStatusIcon(currentPerm, false)}
                      <Chip
                        label={getStatusText(currentPerm)}
                        size="small"
                        color={getStatusColor(currentPerm)}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                    {currentPerm && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {currentPerm.view && (
                          <Chip icon={<Visibility sx={{ fontSize: 12 }} />} label="View" size="small" variant="outlined" />
                        )}
                        {currentPerm.manage && (
                          <Chip icon={<Edit sx={{ fontSize: 12 }} />} label="Manage" size="small" variant="outlined" color="success" />
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* New Role */}
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                New Role
              </Typography>
              <Chip label={comparison.new_role.role_display} size="small" color="primary" />
            </Box>
            <Stack spacing={1}>
              {Array.from(allModuleKeys).map((moduleKey) => {
                const newPerm = getNewPermission(moduleKey);
                const isGained = comparison.differences.gained.some((g) => g.key === moduleKey);
                const isChanged = comparison.differences.changed.some((c) => c.key === moduleKey);

                const moduleIconConfig = getModuleIcon(moduleKey);
                const ModuleIcon = moduleIconConfig?.icon ? getIconComponent(moduleIconConfig.icon) : null;

                return (
                  <Box
                    key={moduleKey}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: isGained ? 'success.main' : isChanged ? 'warning.main' : 'divider',
                      bgcolor: isGained ? 'success.lighter' : isChanged ? 'warning.lighter' : 'background.paper'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {ModuleIcon && <ModuleIcon size={18} style={{ flexShrink: 0 }} />}
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                        {getModuleDisplayName(moduleKey)}
                      </Typography>
                      {getStatusIcon(newPerm, true)}
                      <Chip
                        label={getStatusText(newPerm)}
                        size="small"
                        color={getStatusColor(newPerm)}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                    {newPerm && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {newPerm.view && <Chip icon={<Visibility sx={{ fontSize: 12 }} />} label="View" size="small" variant="outlined" />}
                        {newPerm.manage && (
                          <Chip icon={<Edit sx={{ fontSize: 12 }} />} label="Manage" size="small" variant="outlined" color="success" />
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
