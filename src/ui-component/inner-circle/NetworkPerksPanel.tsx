import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, FormControlLabel, Skeleton, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  acceptPerkRecommendation,
  dismissPerkRecommendation,
  fetchNetworkPolicies,
  fetchPerkRecommendations,
  saveNetworkPolicies,
  type NetworkPolicy,
  type PerkRecommendation
} from 'api/innerCircle.api';
import { NETWORK_PRIVACY, policiesValid, policyPayload, WEEKDAYS } from 'views/inner-circle/network';
import RecommendationHint from './RecommendationHint';

export function NetworkPerksEditor({
  rows,
  onChange,
  recommendation,
  canEdit = true,
  onSuggested
}: {
  rows: NetworkPolicy[];
  onChange: (rows: NetworkPolicy[]) => void;
  recommendation?: PerkRecommendation;
  canEdit?: boolean;
  onSuggested?: () => void;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3">Allyvia network welcome perks</Typography>
      <Typography variant="body2">
        Offer a first-visit discount to members who discover your store. You fund each offer. Every level starts off, and welcome perks are
        capped at 15%.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {NETWORK_PRIVACY}
      </Typography>
      {rows.map((row) => {
        const suggested = recommendation?.payload.welcome_pct.find((item) => Number(item.level_id) === row.level_id)?.pct;
        const update = (patch: Partial<NetworkPolicy>) =>
          onChange(rows.map((entry) => (entry.level_id === row.level_id ? { ...entry, ...patch } : entry)));
        return (
          <Box key={row.level_id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <FormControlLabel
                sx={{ flex: 1 }}
                control={<Switch checked={row.is_active} onChange={(_, checked) => update({ is_active: checked })} disabled={!canEdit} />}
                label={`${row.level_name} · ${row.is_active ? 'On' : 'Off'}`}
              />
              <TextField
                label={`${row.level_name} welcome discount (%)`}
                type="number"
                size="small"
                value={row.welcome_pct ?? ''}
                onChange={(e) => update({ welcome_pct: e.target.value })}
                disabled={!canEdit}
                inputProps={{ min: 0.01, max: 15, step: 0.5 }}
                helperText="Maximum 15%"
              />
              {recommendation && suggested != null ? (
                <RecommendationHint
                  recommendation={recommendation}
                  field="welcome_pct"
                  pct={suggested}
                  disabled={!canEdit}
                  onPick={() => {
                    update({ welcome_pct: String(suggested) });
                    onSuggested?.();
                  }}
                />
              ) : null}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function NetworkPerksPanel({ companyId, isAdmin }: { companyId: string; isAdmin: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const client = useQueryClient();
  const policies = useQuery({ queryKey: ['network-policies', companyId], queryFn: fetchNetworkPolicies });
  const rec = useQuery({ queryKey: ['perk-recommendations', companyId], queryFn: fetchPerkRecommendations });
  const [rows, setRows] = useState<NetworkPolicy[]>([]);
  const [saving, setSaving] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (policies.data) setRows(policies.data);
  }, [policies.data]);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveNetworkPolicies(policyPayload(rows));
      client.setQueryData(['network-policies', companyId], saved);
      if (suggested && rec.data) {
        try {
          await acceptPerkRecommendation(rec.data.id, ['welcome_pct']);
        } catch {
          enqueueSnackbar('Perks saved; suggestion feedback could not be recorded.', { variant: 'warning' });
        }
      }
      setSuggested(false);
      enqueueSnackbar('Network welcome perks saved.', { variant: 'success' });
    } catch {
      setError('Could not save welcome perks. Check the percentages and try again.');
    } finally {
      setSaving(false);
    }
  };
  if (policies.isPending) return <Skeleton height={240} />;
  if (policies.isError)
    return (
      <Alert severity="error" action={<Button onClick={() => policies.refetch()}>Retry</Button>}>
        Welcome perks could not be loaded.
      </Alert>
    );
  const boost = rec.data?.payload.slow_day_boost;
  return (
    <Stack spacing={2}>
      <NetworkPerksEditor
        rows={rows}
        onChange={(next) => {
          setRows(next);
          setSuggested(false);
        }}
        canEdit={isAdmin && !saving}
        recommendation={rec.data}
        onSuggested={() => setSuggested(true)}
      />
      {!isAdmin ? <Alert severity="info">An administrator can change these welcome perks.</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!policiesValid(rows) ? (
        <Alert severity="warning">Enter a percentage greater than 0 and no more than 15% for each configured offer.</Alert>
      ) : null}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={save} disabled={!isAdmin || saving || !policiesValid(rows)}>
          {saving ? 'Saving…' : 'Save welcome perks'}
        </Button>
        {rec.data && !rec.data.dismissed_at ? (
          <Button
            onClick={async () => {
              try {
                await dismissPerkRecommendation(rec.data!.id);
                await client.invalidateQueries({ queryKey: ['perk-recommendations', companyId] });
              } catch {
                setError('Could not dismiss this suggestion. Try again.');
              }
            }}
          >
            Dismiss suggestions
          </Button>
        ) : null}
      </Stack>
      {boost && boost.weekdays.length > 0 ? (
        <Alert severity="info">
          <Typography fontWeight={700}>Slow-day idea: {boost.weekdays.map((day) => WEEKDAYS[day]).join(' and ')}</Typography>
          <Typography variant="body2">
            {boost.extra_stars_multiplier}× stars ·{' '}
            {boost.expected_lift == null
              ? 'Not enough data for a scenario.'
              : `${(boost.expected_lift * 100).toFixed(0)}% illustrative gap recovery.`}{' '}
            This is a scenario, not an active earning rule or measured uplift.
          </Typography>
          <Tooltip title="Coming with the register">
            <span>
              <Button disabled>Apply boost</Button>
            </span>
          </Tooltip>
        </Alert>
      ) : null}
    </Stack>
  );
}
