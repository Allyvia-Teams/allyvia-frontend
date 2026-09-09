// views/scheduling/index.tsx
// Auto-Scheduling module: Template Builder | Availability | Recommendations

import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { useDispatch, useSelector } from 'store';
import { fetchEmployees } from 'store/slices/employee';
import { fetchStaffRoles, fetchTemplateDetail, fetchTemplates } from 'store/slices/scheduling';
import { AvailabilityTab, RecommendationsTab, TemplateBuilderTab } from 'ui-component/scheduling';

const SchedulingPage: React.FC = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = React.useState(0);
  const { currentRole } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.auth) as any;
  const { templates, currentTemplate, loading } = useSelector((state) => state.scheduling);
  const { allEmployees } = useSelector((state) => state.employee);

  const isAdmin = String(currentRole?.role_type || '').toLowerCase() === 'admin';

  React.useEffect(() => {
    dispatch(fetchStaffRoles());
    dispatch(fetchTemplates());
    dispatch(fetchEmployees());
  }, [dispatch]);

  // The default template drives the builder and the coverage heatmap
  React.useEffect(() => {
    if (!templates.length) return;
    const preferred = templates.find((template) => template.is_default) ?? templates[0];
    if (!currentTemplate || currentTemplate.id !== preferred.id) {
      dispatch(fetchTemplateDetail(preferred.id));
    }
  }, [dispatch, templates]);

  const ownEmployeeId = React.useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    const match = allEmployees.find((employee: any) => String(employee.email).toLowerCase() === email);
    return match ? String(match.id) : null;
  }, [allEmployees, user]);

  return (
    <MainCard title="Auto-Scheduling" content={false}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Template Builder" />
        <Tab label="Availability" />
        <Tab label="Recommendations" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === 0 && (
          <TemplateBuilderTab
            template={currentTemplate}
            templateLoading={loading || (templates.length > 0 && !currentTemplate)}
            isAdmin={isAdmin}
            onTemplateCreated={() => setTab(0)}
          />
        )}
        {tab === 1 && <AvailabilityTab template={currentTemplate} isAdmin={isAdmin} ownEmployeeId={ownEmployeeId} />}
        {tab === 2 && <RecommendationsTab isAdmin={isAdmin} />}
      </Box>
    </MainCard>
  );
};

export default SchedulingPage;
