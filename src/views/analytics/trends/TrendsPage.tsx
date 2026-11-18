import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLocalTimeZone, today as calendarToday } from '@internationalized/date';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// project imports
import { useSelector } from 'store';
import { selectEffectiveModulePermissions, selectEffectiveRoleType } from 'store/selectors/effectiveRole';
import type { ModulePermissions } from 'types/settings';
import { listLocations } from 'api/inventoryStock.api';
import { TimelineAPI, isStoreRefused, timelineRefusal, type TimelinePayload } from 'api/timeline.api';
import { LOCATIONS_QUERY_KEY } from 'ui-component/settings/LocationTaxRateEditor';
import { PageHeader, Panel, PanelMessage, isoWindowLabel } from 'ui-component/frame';
import { toISO } from '../analyticsDateRange';
import { NO_ANALYTICS_SENTENCE, canSeeSection } from '../analyticsPage';
import ViewSelect from '../sections/ViewSelect';
import DayPanel from './DayPanel';
import TrendsChart from './TrendsChart';
import {
  PRESETS,
  clampRange,
  dayCount,
  defaultRange,
  monthOfRange,
  monthRange,
  presetOf,
  presetRange,
  MAX_DAYS,
  type RangePreset,
  type TrendsRange
} from './trendsRange';
import {
  ALL_PARAM,
  canSeeAllStores,
  grantedSet,
  paramFor,
  pickStore,
  probeAccess,
  storeChoices,
  type StoreChoice,
  type StorePick
} from './trendsStore';
import {
  LINES,
  availability,
  buildChart,
  dayPanel,
  forecastNote,
  hasNoSales,
  hasNothing,
  lineColours,
  readLines,
  toggleLine,
  writeLines,
  type LineKey
} from './trendsView';

// assets
import { IconArrowLeft, IconListCheck } from '@tabler/icons-react';

// ==============================|| ANALYTICS > TRENDS ||============================== //
//
// One chart for one store: what it took each day, the same weekday last year, the weather, the events and, where
// the store's forecast has been proven, the range we expect ahead. Every sentence and decision comes from
// `trendsView.ts`; this file places them.

export const REFUSED_STORE = "That store isn't available to your role.";
export const LOAD_FAILED = "Couldn't load the trends. Try again.";
export const EMPTY_RANGE = 'No sales data in this range yet.';
export const CUSTOM_RANGE = 'Custom range';

export interface TrendsPageViewProps {
  status: 'loading' | 'error' | 'ready';
  payload?: TimelinePayload;
  /** The sentence for an error. */
  message?: string;
  onRetry?: () => void;
  range: TrendsRange;
  today: string;
  onRange: (range: TrendsRange) => void;
  pick: StorePick;
  choices: StoreChoice[];
  onStore: (selected: string) => void;
  chosenLines: LineKey[];
  onLines: (lines: LineKey[]) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

function LinesMenu({ chosen, payload, onChange }: { chosen: LineKey[]; payload?: TimelinePayload; onChange: (lines: LineKey[]) => void }) {
  const theme = useTheme();
  const colours = lineColours(theme);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const exists = availability(payload);
  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<IconListCheck size={16} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
      >
        Lines
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { 'aria-label': 'Lines on the chart' } }}
      >
        {LINES.map((line) => {
          const info = exists[line.key];
          const always = line.key === 'sales';
          return (
            <MenuItem
              key={line.key}
              disabled={always || !info.available}
              onClick={() => onChange(toggleLine(chosen, line.key))}
              sx={{ minWidth: 260, opacity: '1 !important' }}
            >
              <Checkbox
                edge="start"
                checked={always || (info.available && chosen.includes(line.key))}
                tabIndex={-1}
                disableRipple
                size="small"
              />
              <Box
                component="span"
                aria-hidden
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: colours[line.key],
                  mr: 1.25,
                  flexShrink: 0,
                  opacity: info.available ? 1 : 0.4
                }}
              />
              <ListItemText
                primary={line.label}
                secondary={always ? 'Always on' : info.available ? null : info.reason}
                slotProps={{ primary: { sx: { color: info.available ? 'text.primary' : 'text.disabled' } } }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

function Controls(
  props: Pick<TrendsPageViewProps, 'range' | 'today' | 'onRange' | 'pick' | 'choices' | 'onStore' | 'chosenLines' | 'onLines' | 'payload'>
) {
  const { range, today, onRange, pick, choices, onStore, chosenLines, onLines, payload } = props;
  const preset = presetOf(range, today);
  const month = monthOfRange(range);
  const presetValue = preset ?? 'custom';
  return (
    <>
      <Button component={RouterLink} to="/analytics" variant="text" color="secondary" startIcon={<IconArrowLeft size={16} />}>
        Back to Analytics
      </Button>
      {pick.showPicker ? (
        <ViewSelect
          label="Store"
          value={pick.selected}
          options={[
            ...choices.map((c) => ({ value: c.id, label: c.name })),
            ...(pick.offerAll ? [{ value: ALL_PARAM, label: 'All stores' }] : [])
          ]}
          onChange={onStore}
        />
      ) : null}
      <ViewSelect
        label="Range"
        value={presetValue}
        options={[...(preset ? [] : [{ value: 'custom', label: month ? monthLabel(month) : CUSTOM_RANGE }]), ...PRESETS]}
        onChange={(value) => value !== 'custom' && onRange(presetRange(value as RangePreset, today))}
      />
      <TextField
        type="month"
        size="small"
        value={month ?? ''}
        onChange={(e) => {
          const next = monthRange(e.target.value);
          if (next) onRange(next);
        }}
        slotProps={{ htmlInput: { 'aria-label': 'Jump to a month' } }}
        sx={{ width: 160, '& .MuiInputBase-input': { py: '6px', fontSize: '0.875rem' } }}
      />
      <LinesMenu chosen={chosenLines} payload={payload} onChange={onLines} />
    </>
  );
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The page with everything it needs passed in: the container below fetches, this places. */
export function TrendsPageView(props: TrendsPageViewProps) {
  const { status, payload, message, onRetry, range, today, pick, choices, chosenLines, selectedDate, onSelectDate } = props;
  const storeName = payload
    ? payload.scope === 'store'
      ? payload.store
      : 'All stores'
    : (choices.find((c) => c.id === pick.selected)?.name ?? (pick.selected === ALL_PARAM ? 'All stores' : null));
  const subtitle = [storeName, isoWindowLabel(range.start, range.end)].filter(Boolean).join(' · ');

  const model = useMemo(() => (payload ? buildChart(payload, chosenLines) : null), [payload, chosenLines]);
  const panel = useMemo(() => {
    const day = payload?.days.find((d) => d.date === selectedDate);
    return payload && day ? dayPanel(day, payload) : null;
  }, [payload, selectedDate]);
  const note = payload ? forecastNote(payload) : null;

  let body: ReactNode;
  if (status === 'loading') {
    body = (
      <Box sx={{ p: '14px' }} aria-busy="true" aria-label="Loading the trends">
        <Skeleton variant="rounded" height={340} />
      </Box>
    );
  } else if (status === 'error' || !payload || !model) {
    body = (
      <PanelMessage>
        {message ?? LOAD_FAILED}
        {onRetry ? (
          <Button size="small" variant="outlined" color="secondary" onClick={onRetry} sx={{ ml: 1.5 }}>
            Retry
          </Button>
        ) : null}
      </PanelMessage>
    );
  } else if (hasNothing(model)) {
    body = <PanelMessage>{EMPTY_RANGE}</PanelMessage>;
  } else {
    body = (
      <>
        <TrendsChart model={model} currency={payload.currency} selectedDate={selectedDate} onSelect={onSelectDate} />
        {hasNoSales(payload) ? (
          <Typography sx={{ px: '14px', pb: '10px', fontSize: '0.8125rem', color: 'text.secondary' }}>{EMPTY_RANGE}</Typography>
        ) : null}
        {note ? <Typography sx={{ px: '14px', pb: '12px', fontSize: '0.8125rem', color: 'text.disabled' }}>{note}</Typography> : null}
      </>
    );
  }

  return (
    <Box>
      <PageHeader title="Trends" subtitle={subtitle || undefined} right={<Controls {...props} />} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px' }, gap: 2, alignItems: 'start' }}>
        <Panel
          title="Sales, last year, weather and events"
          note={dayCount(range) > 0 && dayCount(range) <= MAX_DAYS ? `${dayCount(range)} days · today is ${today}` : undefined}
        >
          {body}
        </Panel>
        <DayPanel panel={status === 'ready' ? panel : null} />
      </Box>
    </Box>
  );
}

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export default function TrendsPage() {
  const roleType = useSelector(selectEffectiveRoleType);
  const permissions = useSelector(selectEffectiveModulePermissions) as ModulePermissions | undefined;
  const seeMoney = canSeeSection('finance', roleType, permissions);

  const [params, setParams] = useSearchParams();
  const today = useMemo(() => toISO(calendarToday(getLocalTimeZone())) ?? '', []);
  const [range, setRangeState] = useState<TrendsRange>(() => defaultRange(today));
  const [chosenLines, setChosenLines] = useState<LineKey[]>(() => readLines(safeStorage()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Which stores: the company's active stores, then (several only) what this role may read.
  const locations = useQuery({ queryKey: LOCATIONS_QUERY_KEY, queryFn: listLocations, enabled: seeMoney });
  const allChoices = useMemo(() => storeChoices(locations.data), [locations.data]);
  const needsAccess = allChoices.length > 1;
  const access = useQuery({
    queryKey: ['trends-access', allChoices, today],
    queryFn: () => probeAccess((locationId) => TimelineAPI.get({ start: today, end: today, locationId }), allChoices),
    enabled: seeMoney && needsAccess,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const choices = useMemo(
    () => (needsAccess ? storeChoices(locations.data, grantedSet(access.data)) : allChoices),
    [needsAccess, locations.data, allChoices, access.data]
  );
  const pick = pickStore(choices, params.get('location_id'), !needsAccess || canSeeAllStores(access.data));
  const storesReady = locations.isSuccess && (!needsAccess || access.isSuccess);

  const timeline = useQuery({
    queryKey: ['trends-timeline', pick.locationId ?? ALL_PARAM, range.start, range.end],
    queryFn: () => TimelineAPI.get({ start: range.start, end: range.end, locationId: pick.locationId }),
    enabled: seeMoney && storesReady && dayCount(range) >= 1 && dayCount(range) <= MAX_DAYS,
    staleTime: 60 * 1000,
    retry: false
  });

  const setRange = useCallback((next: TrendsRange) => {
    setRangeState(clampRange(next));
    setSelectedDate(null);
  }, []);
  const onStore = useCallback(
    (selected: string) => {
      const value = paramFor(selected, choices);
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set('location_id', value);
          else next.delete('location_id');
          return next;
        },
        { replace: true }
      );
      setSelectedDate(null);
    },
    [choices, setParams]
  );
  const onLines = useCallback((lines: LineKey[]) => {
    setChosenLines(lines);
    writeLines(lines, safeStorage());
  }, []);

  if (!seeMoney) return <Typography sx={{ color: 'text.secondary' }}>{NO_ANALYTICS_SENTENCE}</Typography>;

  const failure =
    (locations.isError && LOAD_FAILED) || (access.isError && LOAD_FAILED) || (timeline.isError && failureSentence(timeline.error)) || null;
  const status: TrendsPageViewProps['status'] = failure ? 'error' : timeline.data && storesReady ? 'ready' : 'loading';
  const retry = () => {
    if (locations.isError) void locations.refetch();
    if (access.isError) void access.refetch();
    if (timeline.isError) void timeline.refetch();
  };

  return (
    <TrendsPageView
      status={status}
      payload={status === 'ready' ? timeline.data : undefined}
      message={failure || undefined}
      onRetry={retry}
      range={range}
      today={today}
      onRange={setRange}
      pick={pick}
      choices={choices}
      onStore={onStore}
      chosenLines={chosenLines}
      onLines={onLines}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
    />
  );
}

function failureSentence(error: unknown): string {
  return timelineRefusal(error) ?? (isStoreRefused(error) ? REFUSED_STORE : LOAD_FAILED);
}
