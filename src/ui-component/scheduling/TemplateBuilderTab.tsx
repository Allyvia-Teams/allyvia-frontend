// Template Builder — weekly grid of blocks per role with min/max steppers,
// fixed/scale toggle, and a live weekly cost range.

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'store';
import {
  createRoleAssignment,
  createStaffRole,
  createTemplate,
  createTemplateBlock,
  deleteTemplateBlock,
  updateTemplateBlock
} from 'api/scheduling.api';
import { fetchStaffRoles, fetchTemplateDetail, fetchTemplates } from 'store/slices/scheduling';
import { ScheduleTemplate, TemplateBlock } from 'types/scheduling';
import { DAY_NAMES, blockHours, formatTime, roleColor } from './utils';

const DEFAULT_RATE = 15;

interface BlockDraft {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  staff_role: number | '';
  min_staff: number;
  max_staff: number;
  scale: boolean;
}

const emptyDraft = (dow: number): BlockDraft => ({
  day_of_week: dow,
  start_time: '09:00',
  end_time: '17:00',
  staff_role: '',
  min_staff: 1,
  max_staff: 2,
  scale: true
});

interface Props {
  template: ScheduleTemplate | null;
  templateLoading: boolean;
  isAdmin: boolean;
  onTemplateCreated: () => void;
}

const TemplateBuilderTab: React.FC<Props> = ({ template, templateLoading, isAdmin, onTemplateCreated }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { roles } = useSelector((state) => state.scheduling);
  const { allEmployees } = useSelector((state) => state.employee);

  const [draft, setDraft] = React.useState<BlockDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardName, setWizardName] = React.useState('Standard Week');

  const blocks = template?.blocks ?? [];

  // Average wage per role: employee rates of anyone assigned would be ideal,
  // but the builder only needs a rough range — role default, else the
  // company-wide average employee rate, else a flat default.
  const companyAvgRate = React.useMemo(() => {
    const rates = allEmployees.map((e: any) => parseFloat(e.rate)).filter((r: number) => r > 0);
    return rates.length ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : DEFAULT_RATE;
  }, [allEmployees]);

  const rateForRole = React.useCallback(
    (roleId: number): number => {
      const role = roles.find((r) => r.id === roleId);
      const fallback = role?.hourly_rate_default ? parseFloat(role.hourly_rate_default) : NaN;
      return Number.isFinite(fallback) && fallback > 0 ? fallback : companyAvgRate;
    },
    [roles, companyAvgRate]
  );

  const costRange = React.useMemo(() => {
    // Live preview: while the block dialog is open, the range reflects the
    // draft as if it were saved
    const effective: Array<{ start: string; end: string; role: number; min: number; max: number }> = blocks
      .filter((block) => !(draft?.id && block.id === draft.id))
      .map((block) => ({
        start: block.start_time,
        end: block.end_time,
        role: block.staff_role,
        min: block.min_staff,
        max: block.max_staff
      }));
    if (draft && draft.staff_role !== '' && draft.start_time !== draft.end_time) {
      effective.push({
        start: draft.start_time,
        end: draft.end_time,
        role: draft.staff_role as number,
        min: draft.min_staff,
        max: draft.max_staff
      });
    }
    let min = 0;
    let max = 0;
    for (const block of effective) {
      const hours = blockHours(block.start, block.end);
      const rate = rateForRole(block.role);
      min += hours * rate * block.min;
      max += hours * rate * block.max;
    }
    return { min, max };
  }, [blocks, draft, rateForRole]);

  const refresh = () => {
    if (template) dispatch(fetchTemplateDetail(template.id));
  };

  const saveBlock = async () => {
    if (!template || !draft || draft.staff_role === '') return;
    if (draft.max_staff < draft.min_staff) {
      enqueueSnackbar('Max staff must be at least min staff', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        day_of_week: draft.day_of_week,
        start_time: draft.start_time,
        end_time: draft.end_time,
        staff_role: draft.staff_role as number,
        min_staff: draft.min_staff,
        max_staff: draft.max_staff,
        flex_rule: draft.scale ? 'scale_with_demand' : 'fixed'
      };
      if (draft.id) {
        await updateTemplateBlock(draft.id, payload);
      } else {
        await createTemplateBlock(template.id, payload);
      }
      setDraft(null);
      refresh();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.error || 'Could not save block', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (blockId: number) => {
    try {
      await deleteTemplateBlock(blockId);
      refresh();
    } catch {
      enqueueSnackbar('Could not delete block', { variant: 'error' });
    }
  };

  const editBlock = (block: TemplateBlock) => {
    setDraft({
      id: block.id,
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      staff_role: block.staff_role,
      min_staff: block.min_staff,
      max_staff: block.max_staff,
      scale: block.flex_rule === 'scale_with_demand'
    });
  };

  const runWizard = async () => {
    setSaving(true);
    try {
      let roleId: number;
      if (roles.length) {
        roleId = roles[0].id;
      } else {
        const created = await createStaffRole({ name: 'Staff' });
        roleId = created.item!.id;
        dispatch(fetchStaffRoles());
      }
      const response = await createTemplate({ name: wizardName, is_default: true });
      const templateId = response.item!.id;

      // Seed blocks from the business profile's time blocks (peak periods
      // scale higher); fall back to a 9-5 scaling block when no profile
      let seeds: Array<{ start: string; end: string; peak: boolean }> = [];
      try {
        const { InsightsAPI } = await import('api/insights.api');
        const profile: any = await InsightsAPI.CompanyProfile.getProfile();
        const schedule = profile?.business_schedule || {};
        const peaks: string[] = schedule.peak_periods || [];
        seeds = Object.entries(schedule.time_blocks || {}).map(([name, block]: [string, any]) => ({
          start: `${String(block.start % 24).padStart(2, '0')}:00`,
          end: `${String(block.end % 24).padStart(2, '0')}:00`,
          peak: peaks.includes(name)
        }));
      } catch {
        // No profile available — use the fallback below
      }
      if (!seeds.length) {
        seeds = [{ start: '09:00', end: '17:00', peak: true }];
      }
      for (let dow = 0; dow < 7; dow += 1) {
        for (const seed of seeds) {
          await createTemplateBlock(templateId, {
            day_of_week: dow,
            start_time: seed.start,
            end_time: seed.end,
            staff_role: roleId,
            min_staff: 1,
            max_staff: seed.peak ? 3 : 2,
            flex_rule: 'scale_with_demand'
          });
        }
      }

      // Qualify every active employee for the seeded role — the optimizer
      // never assigns unqualified employees, so a fresh company would
      // otherwise generate an entirely unfilled schedule
      for (const employee of allEmployees) {
        try {
          await createRoleAssignment({ employee: String(employee.id), staff_role: roleId });
        } catch {
          // already assigned or ineligible — skip
        }
      }

      setWizardOpen(false);
      await dispatch(fetchTemplates());
      onTemplateCreated();
      enqueueSnackbar('Template created — adjust blocks and role assignments to match your week', {
        variant: 'success'
      });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.error || 'Could not create template', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!template && templateLoading) {
    // Never flash the create-template CTA while templates are still loading
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!template) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
        <Typography variant="h4">No schedule template yet</Typography>
        <Typography color="text.secondary" align="center" sx={{ maxWidth: 480 }}>
          A template describes your normal staffing week: which roles you need, when, and how many people. The engine scales it up and down
          with your demand forecast.
        </Typography>
        {isAdmin ? (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setWizardOpen(true)}>
            Create my weekly template
          </Button>
        ) : (
          <Alert severity="info">Ask an admin to set up the schedule template.</Alert>
        )}
        <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)}>
          <DialogTitle>Create weekly template</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1, minWidth: 360 }}>
              <TextField label="Template name" value={wizardName} onChange={(e) => setWizardName(e.target.value)} />
              <Typography variant="body2" color="text.secondary">
                We&apos;ll start with one 9am-5pm block per day that scales between 1 and 3 staff with demand — you can reshape everything
                afterwards.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWizardOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={runWizard} disabled={saving || !wizardName.trim()}>
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="h4">{template.name}</Typography>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Rough weekly labor cost
          </Typography>
          <Typography variant="h5">
            ${Math.round(costRange.min).toLocaleString()} – ${Math.round(costRange.max).toLocaleString()}
          </Typography>
        </Paper>
      </Stack>

      <Grid container spacing={1}>
        {DAY_NAMES.map((dayName, dow) => {
          const dayBlocks = blocks.filter((block) => block.day_of_week === dow).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <Grid key={dayName} size={{ xs: 12, sm: 6, md: 12 / 7 }}>
              <Paper variant="outlined" sx={{ p: 1, minHeight: 180 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" align="center">
                    {dayName}
                  </Typography>
                  {dayBlocks.map((block) => (
                    <Box
                      key={block.id}
                      onClick={() => isAdmin && editBlock(block)}
                      sx={{
                        borderLeft: `4px solid ${roleColor(block.staff_role)}`,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        p: 0.75,
                        cursor: isAdmin ? 'pointer' : 'default'
                      }}
                    >
                      <Typography variant="caption" display="block" fontWeight={600}>
                        {block.staff_role_name}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {formatTime(block.start_time)}–{formatTime(block.end_time)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          size="small"
                          label={
                            block.min_staff === block.max_staff ? `${block.min_staff} staff` : `${block.min_staff}–${block.max_staff} staff`
                          }
                        />
                        {block.flex_rule === 'scale_with_demand' && <Chip size="small" color="primary" variant="outlined" label="scales" />}
                      </Stack>
                    </Box>
                  ))}
                  {isAdmin && (
                    <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => setDraft(emptyDraft(dow))}>
                      Add
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={Boolean(draft)} onClose={() => setDraft(null)}>
        <DialogTitle>{draft?.id ? 'Edit block' : 'Add block'}</DialogTitle>
        {draft && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1, minWidth: 380 }}>
              <FormControl fullWidth>
                <InputLabel>Day</InputLabel>
                <Select label="Day" value={draft.day_of_week} onChange={(e) => setDraft({ ...draft, day_of_week: Number(e.target.value) })}>
                  {DAY_NAMES.map((name, dow) => (
                    <MenuItem key={name} value={dow}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={draft.staff_role} onChange={(e) => setDraft({ ...draft, staff_role: Number(e.target.value) })}>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start"
                  type="time"
                  value={draft.start_time}
                  onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="End"
                  type="time"
                  value={draft.end_time}
                  onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Min staff"
                  type="number"
                  inputProps={{ min: 0, max: 20 }}
                  value={draft.min_staff}
                  onChange={(e) => setDraft({ ...draft, min_staff: Math.max(0, Number(e.target.value)) })}
                  fullWidth
                />
                <TextField
                  label="Max staff"
                  type="number"
                  inputProps={{ min: 0, max: 20 }}
                  value={draft.max_staff}
                  onChange={(e) => setDraft({ ...draft, max_staff: Math.max(0, Number(e.target.value)) })}
                  fullWidth
                />
              </Stack>
              <FormControlLabel
                control={<Switch checked={draft.scale} onChange={(e) => setDraft({ ...draft, scale: e.target.checked })} />}
                label="Scale staffing with demand forecast"
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Box>
            {draft?.id && (
              <Button
                color="error"
                startIcon={<IconTrash size={16} />}
                onClick={() => {
                  removeBlock(draft.id!);
                  setDraft(null);
                }}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="contained" onClick={saveBlock} disabled={saving || draft?.staff_role === ''}>
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TemplateBuilderTab;
