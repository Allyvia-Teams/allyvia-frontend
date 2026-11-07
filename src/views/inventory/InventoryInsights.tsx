// views/inventory/InventoryInsights.tsx
//
// The inventory insights shell (Inventory › Buying › Insights, beside Plan):
// the inventory sector's live recommendations FIRST, then six analytics
// answers sharing one window and one location.
//
// U7 (owner, 2026-11-06): Plan is for sitting down to order a season; this
// page is the day-to-day, in-season nudges, so it opens on Recommendations
// (DEFAULT_INSIGHTS_TAB_INDEX). The tab order lives only in insights.ts's
// INSIGHTS_TAB_SLUGS; every index below is read through insightsTabIndex.
//
// WHY THE WINDOW LIVES UP HERE AND IS PASSED DOWN. Every figure on every tab is
// true only of its window and its scope, so there is exactly one of each and
// each panel captions itself from the response it actually got. If the server
// falls back to its own default window, the caption says so — the picker's
// state is never presented as though it were the measurement.
//
// TWO PANELS DO NOT HONOUR ONE OF THESE CONTROLS, AND THEY SAY SO RATHER THAN
// PRETENDING:
//   - Stock aging accepts `start`/`end`, echoes them, and measures as of today
//     over all history. It is captioned "as of today".
//   - The location comparison accepts `location_id`, echoes it, and computes
//     every store regardless. Its scope chip reads "All locations".
//
// THE FIRST TAB IS NOT ANALYTICS. Recommendations lists the live agent
// recommendations for the inventory sector; it has no window and no location
// filter, so the pickers (and the caption about them) are hidden while it is
// selected rather than left on screen doing nothing. `?tab=recommendations`
// opens it explicitly — the dashboard's "N more in Inventory" caption and
// Plan's "See inventory insights" line link there.
//
// A malformed `location_id` is an UNCAUGHT 500 with an HTML body, so the picker
// only ever offers ids the API gave us and the query builders drop anything
// else. Nothing here lets a user type into that parameter.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Box, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { parseDate } from '@internationalized/date';
import { IconRefresh } from '@tabler/icons-react';

import { Location, listLocations } from 'api/inventoryStock.api';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';

import BuyingMatrixView from './BuyingMatrixView';
import InventoryRecommendationsView from './InventoryRecommendationsView';
import LocationPerformanceView from './LocationPerformanceView';
import LowPerformersView from './LowPerformersView';
import SellThroughView from './SellThroughView';
import ShrinkageView from './ShrinkageView';
import StockAgingView from './StockAgingView';
import {
  DEFAULT_INSIGHTS_TAB_INDEX,
  RECOMMENDATIONS_TAB_INDEX,
  WINDOW_PRESETS,
  insightsTabFromParam,
  insightsTabIndex,
  insightsTabIgnoresWindow,
  isCalendarDate,
  isoDateOf,
  presetWindow
} from './insights';

const CUSTOM = 'custom';
const DEFAULT_PRESET = 90;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Renders nothing until its tab is selected, so a panel fetches only when
 * somebody is looking at it. Six unconditional fetches would put six full
 * catalogue scans on the server for one page view — none of these endpoints
 * paginates. The Recommendations tab relies on it too: its list query (which
 * marks every row it returns as viewed) runs only when the tab is open.
 */
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-insights-panel-${index}`}
      aria-labelledby={`inventory-insights-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const a11yProps = (index: number) => ({
  id: `inventory-insights-tab-${index}`,
  'aria-controls': `inventory-insights-panel-${index}`
});

export default function InventoryInsights() {
  const initial = useMemo(() => presetWindow(DEFAULT_PRESET), []);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [preset, setPreset] = useState<string>(String(DEFAULT_PRESET));
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState('');
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(() => insightsTabFromParam(tabParam) ?? DEFAULT_INSIGHTS_TAB_INDEX);
  const [refreshKey, setRefreshKey] = useState(0);

  // On mount via the initialiser above; this covers a link to `?tab=` while
  // the page is already open (same route, no remount). An unknown or absent
  // value leaves the current tab alone.
  useEffect(() => {
    const fromParam = insightsTabFromParam(tabParam);
    if (fromParam !== null) setTab(fromParam);
  }, [tabParam]);

  const pickersApply = !insightsTabIgnoresWindow(tab);

  useEffect(() => {
    listLocations()
      .then((rows) => setLocations(rows.filter((row) => row.is_active)))
      .catch(() => setLocations([]));
  }, []);

  const applyPreset = (value: string) => {
    setPreset(value);
    if (value === CUSTOM) return;
    const window = presetWindow(Number(value));
    setStart(window.start);
    setEnd(window.end);
  };

  const range: RangeValue | null = isCalendarDate(start) && isCalendarDate(end) ? { start: parseDate(start), end: parseDate(end) } : null;

  const onRangeChange = (value: RangeValue | null) => {
    if (!value?.start || !value?.end) return;
    // Converted through a real Date so the ISO text is zero-padded: Python's
    // date.fromisoformat is strict, and "2026-1-1" is a 400 rather than a
    // lenient parse.
    setStart(isoDateOf(new Date(value.start.year, value.start.month - 1, value.start.day)));
    setEnd(isoDateOf(new Date(value.end.year, value.end.month - 1, value.end.day)));
    setPreset(CUSTOM);
  };

  const scope = locationId || null;
  const viewProps = { start, end, locationId: scope, refreshKey };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard
          title="Inventory insights"
          secondary={
            pickersApply && (
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField
                  select
                  size="small"
                  label="Window"
                  value={preset}
                  onChange={(event) => applyPreset(event.target.value)}
                  sx={{ width: 170 }}
                >
                  {WINDOW_PRESETS.map((option) => (
                    <MenuItem key={option.days} value={String(option.days)}>
                      {option.label}
                    </MenuItem>
                  ))}
                  <MenuItem value={CUSTOM}>Custom</MenuItem>
                </TextField>

                <AllyviaDateRangePicker value={range} onChange={onRangeChange} />

                <TextField
                  select
                  size="small"
                  label="Location"
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">All locations</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Tooltip title="Reload. These panels are cached for up to five minutes server-side, so a change made just now may take a moment to appear.">
                  <IconButton size="small" onClick={() => setRefreshKey((current) => current + 1)}>
                    <IconRefresh size={18} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )
          }
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tab}
              onChange={(_event, value) => setTab(value)}
              aria-label="inventory insights tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{ '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' } }}
            >
              {/* In INSIGHTS_TAB_SLUGS order: MUI gives each Tab its position as its value. */}
              <Tab label="Recommendations" {...a11yProps(RECOMMENDATIONS_TAB_INDEX)} />
              <Tab label="Sell-through" {...a11yProps(insightsTabIndex('sell-through'))} />
              <Tab label="Markdown candidates" {...a11yProps(insightsTabIndex('markdown-candidates'))} />
              <Tab label="Stock aging" {...a11yProps(insightsTabIndex('stock-aging'))} />
              <Tab label="By location" {...a11yProps(insightsTabIndex('by-location'))} />
              <Tab label="Buying matrix" {...a11yProps(insightsTabIndex('buying-matrix'))} />
              <Tab label="Shrinkage" {...a11yProps(insightsTabIndex('shrinkage'))} />
            </Tabs>
          </Box>

          {pickersApply && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              The window and location above apply to every tab except stock aging, which is measured as of today over all history, and the
              location comparison, which always covers every store.
            </Typography>
          )}

          <TabPanel value={tab} index={RECOMMENDATIONS_TAB_INDEX}>
            <InventoryRecommendationsView />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('sell-through')}>
            <SellThroughView {...viewProps} />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('markdown-candidates')}>
            <LowPerformersView {...viewProps} />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('stock-aging')}>
            <StockAgingView {...viewProps} />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('by-location')}>
            <LocationPerformanceView {...viewProps} />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('buying-matrix')}>
            <BuyingMatrixView {...viewProps} />
          </TabPanel>
          <TabPanel value={tab} index={insightsTabIndex('shrinkage')}>
            <ShrinkageView {...viewProps} />
          </TabPanel>
        </MainCard>
      </Grid>
    </Grid>
  );
}
