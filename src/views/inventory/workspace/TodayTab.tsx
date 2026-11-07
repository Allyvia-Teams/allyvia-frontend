// views/inventory/workspace/TodayTab.tsx
//
// I1: Today mounts the live inventory recommendations above the reorder inbox,
// both unchanged. I2 replaces this body with the inbox rebuilt as Today.

import { lazy } from 'react';

import Stack from '@mui/material/Stack';

import Loadable from 'ui-component/Loadable';

const InventoryRecommendationsView = Loadable(lazy(() => import('views/inventory/InventoryRecommendationsView')));
const ReorderInbox = Loadable(lazy(() => import('views/inventory/ReorderInbox')));

export default function TodayTab() {
  return (
    <Stack spacing={2}>
      <InventoryRecommendationsView />
      <ReorderInbox />
    </Stack>
  );
}
