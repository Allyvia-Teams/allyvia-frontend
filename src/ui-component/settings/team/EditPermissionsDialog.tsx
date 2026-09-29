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

import { actionsForModule, cleanPermissions, orphanActionKeys, permissionsDirty, togglePermission } from './permissionDraft';
import { BASELINE_MODULES, ModulePermissions, PermissionKey, TOGGLABLE_MODULES, TeamMember } from 'types/settings';

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

/**
 * Which modules — and which actions inside them — a member may use.
 *
 * Action permissions (ALL-72) render indented beneath the module they depend
 * on. The dependency is enforced three ways, because the backend refuses
 * "pos.refund without pos" and a 400 the admin has to decode is not a save:
 * the sub-toggle is disabled (with the reason) while its module is off,
 * turning the module off clears its actions from the draft, and
 * cleanPermissions drops any orphan that arrived from a hand-edited role.
 * All of that lives in permissionDraft.ts, where it is tested.
 */
export default function EditPermissionsDialog({ open, member, saving, error, onClose, onSave }: EditPermissionsDialogProps) {
  const initial = useMemo<ModulePermissions>(() => ({ ...(member?.module_permissions || {}) }), [member]);
  const [draft, setDraft] = useState<ModulePermissions>(initial);

  useEffect(() => {
    setDraft({ ...(member?.module_permissions || {}) });
  }, [member]);

  const isDirty = useMemo(() => permissionsDirty(initial, draft), [initial, draft]);

  // A role edited by hand before the server validated this column can hold
  // an action without its module. It is a dead grant — the refund views let
  // it through and the POS gate does not — and saving will drop it, so the
  // admin is told before, not after.
  const orphans = useMemo(() => orphanActionKeys(initial), [initial]);

  const handleToggle = (key: PermissionKey) => setDraft((prev) => togglePermission(prev, key));

  const handleSave = async () => {
    await onSave(cleanPermissions(draft));
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
        {orphans.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {orphans.join(', ')} {orphans.length === 1 ? 'is' : 'are'} granted without POS, so {orphans.length === 1 ? 'it' : 'they'} cannot
            work. Saving will remove {orphans.length === 1 ? 'it' : 'them'}; turn on POS first to keep{' '}
            {orphans.length === 1 ? 'it' : 'them'}.
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
          {TOGGLABLE_MODULES.map(({ key, label, description }) => {
            const moduleOn = !!draft[key];
            const actions = actionsForModule(key);
            return (
              <Box key={key}>
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', m: 0, py: 0.75 }}
                  control={<Checkbox checked={moduleOn} onChange={() => handleToggle(key)} disabled={saving} sx={{ pt: 0.5 }} />}
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
                {actions.map((action) => (
                  // A disabled control does not fire hover events, so the
                  // tooltip needs the wrapping span to have something to say
                  // WHY the toggle is off — otherwise it reads as broken.
                  <Tooltip key={action.key} title={moduleOn ? '' : `Turn on ${label} first — this permission needs it.`} placement="left">
                    <span style={{ display: 'block' }}>
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', m: 0, py: 0.5, pl: 4 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={!!draft[action.key]}
                            onChange={() => handleToggle(action.key)}
                            disabled={saving || !moduleOn}
                            sx={{ pt: 0.25 }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{action.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Needs {label}.
                            </Typography>
                          </Box>
                        }
                      />
                    </span>
                  </Tooltip>
                ))}
              </Box>
            );
          })}
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
