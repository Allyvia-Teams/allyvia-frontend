import { useEffect } from 'react';

// icons
import { IconPackages } from '@tabler/icons-react';

// project imports
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { fetchInventoryItemsTreeMap, fetchInventoryOverview } from 'store/slices/analytics';
import { Panel, PanelMessage, StatsStrip, type StatCell } from 'ui-component/frame';
import type { IsoWindow } from './dashboardRange';
import { DEFAULT_CURRENCY, inventoryMarginCaveat, inventoryMarginDisplay, inventoryTotalValue } from 'utils/inventoryKpis';

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);

// ==============================|| DASHBOARD - INVENTORY ||============================== //
// Design handoff Part 2: the inventory KPIs as a stats strip inside a panel.
// Every figure keeps its basis; the margin discloses what it leaves out.

export const InventorySection = ({ window }: { window: IsoWindow }) => {
  const dispatch = useDispatch();
  const {
    inventorySummary: analyticsInventorySummary,
    inventoryItemsTreeMap,
    error: analyticsError
  } = useSelector((state: RootState) => state.analytics);

  // Fetch inventory overview and treemap on mount/range change
  const { startDate, endDate } = window;
  useEffect(() => {
    dispatch(fetchInventoryOverview(undefined) as any);
    dispatch(fetchInventoryItemsTreeMap({ start_date: startDate, end_date: endDate }) as any);
  }, [dispatch, startDate, endDate]);

  // The summary carries no currency; the treemap is the only source that does.
  const inventoryCurrency = inventoryItemsTreeMap?.currency || DEFAULT_CURRENCY;

  // Retail (quantity x unit_price) is the basis line under the at-cost headline.
  // Read through the shared helper so this surface and the analytics tab cannot
  // drift: it prefers the summary's ACTIVE-only total and falls back to the
  // treemap only until that arrives.
  const retailValue = inventoryTotalValue(analyticsInventorySummary, inventoryItemsTreeMap);

  // "$0 at retail" before the first response is a claim, not a reading (ALL-103).
  const hasRetailBasis = analyticsInventorySummary?.total_value != null || inventoryItemsTreeMap?.totals?.categories?.value != null;

  // The margin measures only stock whose cost is known, so the cell has to
  // disclose what it left out rather than present a subset as the shop.
  const marginCaveat = inventoryMarginCaveat(analyticsInventorySummary, inventoryCurrency);

  const stats: StatCell[] = [
    {
      label: 'Low stock',
      value: (analyticsInventorySummary?.low_stock_count ?? 0).toLocaleString(),
      basis: 'items at or below reorder point',
      tone: (analyticsInventorySummary?.low_stock_count ?? 0) > 0 ? 'warning' : 'default'
    },
    {
      label: 'Out of stock',
      value: (analyticsInventorySummary?.out_of_stock_count ?? 0).toLocaleString(),
      basis: 'items at zero',
      tone: (analyticsInventorySummary?.out_of_stock_count ?? 0) > 0 ? 'error' : 'default'
    },
    {
      // Inventory is a balance-sheet asset and is carried at COST (ALL-99).
      // Retail is the basis line, clearly labelled.
      label: 'Value at cost',
      value: formatCurrency(analyticsInventorySummary?.total_cost_value ?? 0, inventoryCurrency),
      basis: hasRetailBasis ? `${formatCurrency(retailValue, inventoryCurrency)} at retail` : undefined
    },
    {
      label: 'Margin (known cost)',
      value: inventoryMarginDisplay(analyticsInventorySummary),
      basis: marginCaveat ? marginCaveat.label : 'on-hand value weighted',
      basisTooltip: marginCaveat?.tooltip
    }
  ];

  return (
    <Panel title="Inventory" icon={<IconPackages size={17} stroke={1.75} />} note="Snapshot as of now">
      {analyticsError ? <PanelMessage tone="error">Couldn&apos;t load inventory right now.</PanelMessage> : <StatsStrip stats={stats} />}
    </Panel>
  );
};
