import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { BASELINE_MODULES, ModuleKey, ModulePermissions, TOGGLABLE_MODULES, TeamMember } from 'types/settings';

interface EditPermissionsDialogProps {
  open: boolean;
  member: TeamMember | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (permissions: ModulePermissions) => Promise<void> | void;
}

const baselineLabels: Record<string, { label: string; description: string }> = {
  inventory: { label: 'Inventory', description: 'View and update stock — included for every member.' },
  clock: { label: 'Clock-in / Clock-out', description: 'Record shift hours — included for every member.' }
};

export default function EditPermissionsDialog({ open, member, saving, error, onClose, onSave }: EditPermissionsDialogProps) {
  const initial = useMemo<ModulePermissions>(() => ({ ...(member?.module_permissions || {}) }), [member]);
  const [draft, setDraft] = useState<ModulePermissions>(initial);

  useEffect(() => {
    setDraft({ ...(member?.module_permissions || {}) });
  }, [member]);

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(initial), ...Object.keys(draft)]) as Set<string>;
    for (const k of keys) {
      const a = !!initial[k as ModuleKey];
      const b = !!draft[k as ModuleKey];
      if (a !== b) return true;
    }
    return false;
  }, [initial, draft]);

  const handleToggle = (key: ModuleKey) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    // Strip false values so the stored object stays compact: {pos: true} instead
    // of {pos: true, finance: false, crm: false, ...}.
    const cleaned: ModulePermissions = {};
    (Object.keys(draft) as ModuleKey[]).forEach((k) => {
      if (draft[k]) cleaned[k] = true;
    });
    await onSave(cleaned);
  };

  const memberName = member?.user_name || `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || member?.user_email || 'member';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Edit permissions
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {memberName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">
            Always granted
          </Typography>
          {BASELINE_MODULES.map((key) => {
            const meta = baselineLabels[key] || { label: key, description: '' };
            return (
              <Tooltip key={key} title="Included for every member and cannot be removed." placement="left">
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', m: 0, py: 0.75 }}
                  control={<Checkbox checked disabled sx={{ pt: 0.5 }} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {meta.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {meta.description}
                      </Typography>
                    </Box>
                  }
                />
              </Tooltip>
            );
          })}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="overline" color="text.secondary">
            Optional modules
          </Typography>
          {TOGGLABLE_MODULES.map(({ key, label, description }) => (
            <FormControlLabel
              key={key}
              sx={{ alignItems: 'flex-start', m: 0, py: 0.75 }}
              control={<Checkbox checked={!!draft[key]} onChange={() => handleToggle(key)} disabled={saving} sx={{ pt: 0.5 }} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty || saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
