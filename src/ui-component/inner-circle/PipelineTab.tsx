import { useState } from 'react';

import { Box, Tab, Tabs } from '@mui/material';

import DealsTab from './DealsTab';
import LeadsTab from './LeadsTab';

type PipelineView = 'leads' | 'deals';

interface PipelineTabProps {
  initialView?: PipelineView;
  deepLinkRecordId?: string | null;
  onDeepLinkHandled?: () => void;
}

// ==============================|| PIPELINE TAB (Leads + Deals) ||============================== //

export default function PipelineTab({ initialView = 'leads', deepLinkRecordId = null, onDeepLinkHandled }: PipelineTabProps) {
  const [view, setView] = useState<PipelineView>(initialView);

  return (
    <Box>
      <Tabs value={view} onChange={(_event, value: PipelineView) => setView(value)} sx={{ mb: 2 }}>
        <Tab label="Leads" value="leads" sx={{ textTransform: 'none', minHeight: 40 }} />
        <Tab label="Deals" value="deals" sx={{ textTransform: 'none', minHeight: 40 }} />
      </Tabs>
      {view === 'leads' && (
        <LeadsTab deepLinkRecordId={initialView === 'leads' ? deepLinkRecordId : null} onDeepLinkHandled={onDeepLinkHandled} />
      )}
      {view === 'deals' && (
        <DealsTab deepLinkRecordId={initialView === 'deals' ? deepLinkRecordId : null} onDeepLinkHandled={onDeepLinkHandled} />
      )}
    </Box>
  );
}
