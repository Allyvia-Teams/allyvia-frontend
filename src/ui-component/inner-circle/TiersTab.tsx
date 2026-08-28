import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconTrash } from '@tabler/icons-react';

import { fetchCustomers, fetchTierLadder, saveTierLadder, type TierLadderWindow } from 'api/innerCircle.api';
import { useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { hasPermission, RoleType } from 'utils/role';
import {
  addLevel,
  blockerForLevel,
  describeRemoval,
  graceHelp,
  LADDER_WINDOWS,
  ladderDiffers,
  LEADERBOARD_MISMATCH_NOTICE,
  LOWER_INSTEAD_HINT,
  MAX_LEVELS,
  moveLevel,
  NO_OP_NOTICE,
  NON_ADMIN_TIER_LADDER_NOTICE,
  ONE_WAY_NOTICE,
  orphanBlockers,
  parseTierLadderError,
  PROMISE_NOTICE,
  removedLevelIds,
  removeLevel,
  restoreLevel,
  setLevel,
  starterLadderDraft,
  suggestLadderFromSpend,
  toLadderDraft,
  toLadderPutPayload,
  toSpendSample,
  unwrapLadder,
  validateLadder,
  windowHelp,
  windowLabel,
  WINDOW_CHANGE_NOTICE,
  WRONG_BOUTIQUE_HINT,
  type LadderDraft,
  type ParsedLadderError,
  type SeedSuggestion
} from 'views/inner-circle/tierLadder';

/**
 * Name the tiers, and say what earns them.
 *
 * Every rule lives in views/inner-circle/tierLadder — this file only renders
 * what that module decides, because this repo has no DOM test infrastructure
 * and a component is therefore unreachable by the suite.
 *
 * Two server behaviours shape the whole screen. A save that removes a level
 * somebody still holds is refused BEFORE the transaction, so nothing at all
 * is applied — not the renames, not the reorder — which is why an error must
 * never reset the draft and why the copy says so out loud. And a level's `id`
 * is its identity: drop one and the server reads a delete-then-create, so the
 * payload is built in exactly one place.
 */
export default function TiersTab() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  const isAdmin = !!roleType && hasPermission(roleType, RoleType.ADMIN);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<LadderDraft | null>(null);
  const [serverError, setServerError] = useState<ParsedLadderError | null>(null);
  const [seed, setSeed] = useState<SeedSuggestion | null>(null);
  const [seeding, setSeeding] = useState(false);

  const {
    data: ladder,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['ic-tier-ladder', companyId],
    queryFn: fetchTierLadder,
    select: unwrapLadder,
    enabled: !!companyId,
    // An editor that refetches on focus is the classic lost-edit bug.
    refetchOnWindowFocus: false
  });

  const dirty = useMemo(() => (draft ? ladderDiffers(ladder ?? null, draft) : false), [ladder, draft]);
  const problems = useMemo(() => (draft ? validateLadder(draft) : null), [draft]);

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!ladder) return;
    // Never clobber unsaved edits with a background refetch.
    if (dirtyRef.current) return;
    setDraft(toLadderDraft(ladder));
    setServerError(null);
  }, [ladder]);

  const saveMutation = useMutation({
    mutationFn: saveTierLadder,
    onSuccess: (response) => {
      const saved = unwrapLadder(response);
      queryClient.setQueryData(['ic-tier-ladder', companyId], response);
      // THE SECOND-SAVE TRAP: a level created just now receives its id only
      // here. Without re-seeding, the next save sends it id-less again — a
      // duplicate, and a delete of the one the server just made.
      if (saved) setDraft(toLadderDraft(saved));
      setServerError(null);
      setSeed(null);
      enqueueSnackbar('Tier ladder saved', { variant: 'success' });
    },
    onError: (err) => {
      // Deliberately does NOT touch the draft: the save was refused before
      // the transaction, so everything typed is still unsaved and valuable.
      setServerError(parseTierLadderError(err));
      enqueueSnackbar('Nothing was saved — see the details above.', { variant: 'error' });
    }
  });

  const patch = (next: Partial<LadderDraft>) => setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const handleSave = () => {
    if (!draft || !problems?.valid) return;
    const payload = toLadderPutPayload(draft);
    const removed = removedLevelIds(ladder ?? null, payload);
    if (removed.length && ladder && !window.confirm(describeRemoval(ladder, removed))) return;
    saveMutation.mutate(payload);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const page = await fetchCustomers({ ordering: '-ltv', page_size: 100, page: 1 });
      const suggestion = suggestLadderFromSpend(toSpendSample(page), draft?.window ?? 'rolling_365');
      setSeed(suggestion);
      setDraft((prev) => ({
        window: prev?.window ?? 'rolling_365',
        graceDays: prev?.graceDays ?? 30,
        levels: suggestion.levels
      }));
    } catch {
      enqueueSnackbar('Could not read member spend just now.', { variant: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  const adminTip = (title: string) => (isAdmin ? title : NON_ADMIN_TIER_LADDER_NOTICE);

  if (isLoading) {
    return (
      <MainCard title="Tiers">
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={96} />
          ))}
        </Stack>
      </MainCard>
    );
  }

  if (isError) {
    return (
      <MainCard title="Tiers">
        <Typography color="error" sx={{ mb: 1.5 }}>
          Failed to load the tier ladder.
        </Typography>
        <Button variant="outlined" onClick={() => refetch()} sx={{ textTransform: 'none' }}>
          Retry
        </Button>
      </MainCard>
    );
  }

  return (
    <MainCard title="Tiers">
      <Stack spacing={3}>
        <Alert severity="info">{PROMISE_NOTICE}</Alert>

        {!ladder && !draft ? (
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              This boutique still uses Allyvia&apos;s built-in tiers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Members are ranked Shopper, Regular and Vault by Allyvia&apos;s built-in engine. Switch to a threshold ladder to name your own
              levels and set exactly how much spend earns each one.
            </Typography>
            <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
              {ONE_WAY_NOTICE}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              {WRONG_BOUTIQUE_HINT}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title={adminTip('Creates an unsaved draft — nothing is written yet.')}>
                <span>
                  <Button
                    variant="contained"
                    disabled={!isAdmin}
                    onClick={() => setDraft(starterLadderDraft())}
                    sx={{ textTransform: 'none' }}
                  >
                    Set up a threshold ladder
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={adminTip('Reads what members have spent and proposes levels. Nothing is written.')}>
                <span>
                  <Button variant="outlined" disabled={!isAdmin || seeding} onClick={handleSeed} sx={{ textTransform: 'none' }}>
                    {seeding ? 'Reading spend…' : 'Suggest levels from member spend'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        ) : null}

        {draft ? (
          <Box>
            {seed ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {seed.caveat}
              </Alert>
            ) : null}

            {serverError ? (
              <Alert severity={serverError.noOp ? 'warning' : 'error'} sx={{ mb: 2 }}>
                <AlertTitle>{serverError.noOp ? 'Nothing was saved' : 'The ladder could not be saved'}</AlertTitle>
                <Typography variant="body2">{serverError.summary}</Typography>
                {serverError.noOp ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {NO_OP_NOTICE}
                  </Typography>
                ) : null}
                {serverError.general.map((line) => (
                  <Typography key={line} variant="body2" sx={{ mt: 0.5 }}>
                    {line}
                  </Typography>
                ))}
                {orphanBlockers(serverError.blockers, draft.levels).map((blocker) => (
                  <Stack key={blocker.levelId} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {blocker.message}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        if (!ladder || !blocker.levelId) return;
                        const restored = restoreLevel(draft.levels, ladder, blocker.levelId);
                        if (restored) patch({ levels: restored });
                      }}
                      sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                      Restore {blocker.name}
                    </Button>
                  </Stack>
                ))}
                {serverError.blockers.length ? (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {LOWER_INSTEAD_HINT}
                  </Typography>
                ) : null}
              </Alert>
            ) : null}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Spend is measured over
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={draft.window}
              onChange={(_e, value) => value && patch({ window: value as TierLadderWindow })}
              sx={{ mb: 0.5 }}
            >
              {LADDER_WINDOWS.map((option) => (
                <ToggleButton key={option} value={option} sx={{ textTransform: 'none' }}>
                  {windowLabel(option)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" display="block">
              {windowHelp(draft.window)}
            </Typography>
            {ladder && draft.window !== ladder.window ? (
              <Typography variant="caption" color="warning.main" display="block">
                {WINDOW_CHANGE_NOTICE}
              </Typography>
            ) : null}
            {draft.window !== 'lifetime' ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {LEADERBOARD_MISMATCH_NOTICE}
              </Typography>
            ) : null}

            <TextField
              type="number"
              size="small"
              label="Grace period"
              value={draft.graceDays}
              onChange={(e) => patch({ graceDays: Number(e.target.value) })}
              inputProps={{ min: 0, max: 365, step: 1 }}
              helperText={graceHelp(draft.graceDays)}
              sx={{ mt: 2, mb: 2, maxWidth: 320 }}
            />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Spend to earn it</TableCell>
                  <TableCell>Colour</TableCell>
                  <TableCell align="right">Order</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {draft.levels.map((level, index) => {
                  const rowProblem = problems?.byIndex.get(index) ?? null;
                  const rowBlocker = serverError ? blockerForLevel(serverError.blockers, level.id) : null;
                  return (
                    <TableRow key={level.rowKey} selected={Boolean(rowProblem || rowBlocker)}>
                      <TableCell>
                        <Typography variant="body2">#{index + 1}</Typography>
                        {index === 0 ? <Chip size="small" label="Base" sx={{ mt: 0.5 }} /> : null}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={level.name}
                          disabled={!isAdmin}
                          onChange={(e) => patch({ levels: setLevel(draft.levels, index, { name: e.target.value }) })}
                          error={Boolean(rowProblem)}
                          helperText={rowProblem ?? rowBlocker?.message ?? ''}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={index === 0 ? '0.00' : level.threshold}
                          disabled={!isAdmin || index === 0}
                          onChange={(e) => patch({ levels: setLevel(draft.levels, index, { threshold: e.target.value }) })}
                          helperText={index === 0 ? 'Fixed — the floor everyone qualifies for.' : ''}
                          sx={{ maxWidth: 160 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="color"
                          size="small"
                          value={level.color || '#cccccc'}
                          disabled={!isAdmin}
                          onChange={(e) => patch({ levels: setLevel(draft.levels, index, { color: e.target.value }) })}
                          sx={{ width: 72 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Move ${level.name || 'this level'} up`}
                          disabled={!isAdmin || index === 0}
                          onClick={() => patch({ levels: moveLevel(draft.levels, index, index - 1) })}
                        >
                          <IconArrowUp size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`Move ${level.name || 'this level'} down`}
                          disabled={!isAdmin || index === draft.levels.length - 1}
                          onClick={() => patch({ levels: moveLevel(draft.levels, index, index + 1) })}
                        >
                          <IconArrowDown size={16} />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove this level. If any member currently holds it, nothing is saved — lower its threshold instead.">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!isAdmin || draft.levels.length === 1}
                              onClick={() => patch({ levels: removeLevel(draft.levels, index) })}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Button
              size="small"
              disabled={!isAdmin || draft.levels.length >= MAX_LEVELS}
              onClick={() => {
                const next = addLevel(draft.levels);
                if (next) patch({ levels: next });
              }}
              sx={{ textTransform: 'none', mt: 1 }}
            >
              Add level
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              A ladder can have up to {MAX_LEVELS} levels.
            </Typography>

            {problems?.form.map((line) => (
              <Typography key={line} variant="caption" color="error" display="block">
                {line}
              </Typography>
            ))}
            {problems?.warnings.map((line) => (
              <Typography key={line} variant="caption" color="text.secondary" display="block">
                {line}
              </Typography>
            ))}

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
              <Tooltip title={adminTip('Replaces the whole ladder. Order on screen is the order saved.')}>
                <span>
                  <Button
                    variant="contained"
                    disabled={!isAdmin || saveMutation.isPending || !dirty || !problems?.valid}
                    onClick={handleSave}
                    sx={{ textTransform: 'none' }}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save ladder'}
                  </Button>
                </span>
              </Tooltip>
              <Button
                disabled={saveMutation.isPending || !dirty}
                onClick={() => {
                  setDraft(ladder ? toLadderDraft(ladder) : null);
                  setServerError(null);
                  setSeed(null);
                }}
                sx={{ textTransform: 'none' }}
              >
                Discard changes
              </Button>
              {dirty ? (
                <Typography variant="caption" color="text.secondary">
                  Unsaved changes — nothing is written until you save.
                </Typography>
              ) : null}
            </Stack>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Discounts and perks are still set per built-in tier on the Benefits tab. Levels beyond the first three won&apos;t have a
              discount row until benefits become ladder-driven.
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </MainCard>
  );
}
