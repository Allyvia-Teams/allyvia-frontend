// views/inventory/workspace/InventoryWorkspace.tsx
//
// The one Inventory page at /inventory. Its state is the URL (tabs.ts): the
// title row, the five pill tabs and the selected tab's body in a centred
// column. Today's count is the live inventory recommendations; Buying's is
// orders still waiting on stock. Neither counts while loading or on error.

import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';

import { listPurchaseOrders } from 'api/inventoryPurchasing.api';
import { useSectorRecommendations } from 'ui-component/agent/useSectorRecommendations';
import { PageHeader } from 'ui-component/frame';

import { purchaseOrderListQuery } from '../purchasing';
import {
  buyingAttentionCount,
  INVENTORY_PATH,
  normalizedWorkspaceParams,
  PO_ATTENTION_QUERY_KEY,
  readWorkspaceParams,
  tabSubtitle
} from '../tabs';
import { todayRefreshedAt } from '../today';
import BuyingTab from './BuyingTab';
import CountsTab from './CountsTab';
import ReportsTab from './ReportsTab';
import StockTab from './StockTab';
import TabRow from './TabRow';
import TodayTab from './TodayTab';
import WorkspaceHeader from './WorkspaceHeader';

export { PO_ATTENTION_QUERY_KEY };

export default function InventoryWorkspace() {
  const [searchParams] = useSearchParams();
  const { tab, view, creating } = readWorkspaceParams(searchParams);

  const recs = useSectorRecommendations('inventory');
  const todayCount = recs.isLoading || recs.isError ? null : recs.recommendations.length;
  const refreshedAt = todayCount === null ? null : todayRefreshedAt(recs.recommendations);

  const orders = useQuery({
    queryKey: PO_ATTENTION_QUERY_KEY,
    queryFn: () => listPurchaseOrders(purchaseOrderListQuery({ statuses: ['submitted', 'partially_received'] })),
    staleTime: 60_000,
    retry: false
  });
  const buyingCount = orders.data && !orders.isError ? buyingAttentionCount(orders.data) : null;

  // A bare ?itemId= link redirects to tab=stock&view=items&itemId=… BEFORE any
  // tab body mounts. Writing the tab from an effect raced the item page, whose
  // deferred deletion of itemId used the params it captured on first render
  // and wiped the tab. (After the hooks above, which must run on every render.)
  const normalized = normalizedWorkspaceParams(searchParams);
  if (normalized) return <Navigate to={`${INVENTORY_PATH}?${normalized.toString()}`} replace />;

  let body;
  if (tab === 'stock') body = <StockTab view={view} />;
  else if (tab === 'buying') body = <BuyingTab view={view} />;
  else if (tab === 'counts') body = <CountsTab view={view} creating={creating} />;
  else if (tab === 'reports') body = <ReportsTab view={view} />;
  else body = <TodayTab />;

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={tabSubtitle(tab, { today: todayCount, refreshedAt }) || undefined}
        right={<WorkspaceHeader tab={tab} />}
        tabs={<TabRow tab={tab} counts={{ today: todayCount, buying: buyingCount }} />}
      />
      <Box sx={{ width: '100%' }}>{body}</Box>
    </>
  );
}
