import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, Tab, Tabs, Typography } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// CRM tabs
import ContactsTab from './tabs/ContactsTab';
import LeadsTab from './tabs/LeadsTab';
import DealsTab from './tabs/DealsTab';
import TasksTab from './tabs/TasksTab';
import NotesTab from './tabs/NotesTab';

// assets
import { IconUsers, IconTarget, IconBriefcase, IconChecklist, IconNotes } from '@tabler/icons-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TAB_KEYS = ['contacts', 'leads', 'deals', 'tasks', 'notes'] as const;

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`crm-tabpanel-${index}`} aria-labelledby={`crm-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `crm-tab-${index}`,
    'aria-controls': `crm-tabpanel-${index}`
  };
}

// ==============================|| CRM MAIN PAGE ||============================== //

export default function CRMMain() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const recordId = searchParams.get('recordId');
  const tabIndexFromParam = tabParam ? TAB_KEYS.indexOf(tabParam as (typeof TAB_KEYS)[number]) : -1;
  const [value, setValue] = useState(tabIndexFromParam >= 0 ? tabIndexFromParam : 0);

  useEffect(() => {
    if (tabIndexFromParam >= 0) {
      setValue(tabIndexFromParam);
    }
  }, [tabIndexFromParam]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const clearDeepLinkRecord = () => {
    if (!searchParams.has('recordId')) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  };

  const tabs = [
    {
      label: 'Contacts',
      icon: <IconUsers stroke={1.5} size="20px" />,
      component: <ContactsTab deepLinkRecordId={tabParam === 'contacts' ? recordId : null} onDeepLinkHandled={clearDeepLinkRecord} />
    },
    {
      label: 'Leads',
      icon: <IconTarget stroke={1.5} size="20px" />,
      component: <LeadsTab deepLinkRecordId={tabParam === 'leads' ? recordId : null} onDeepLinkHandled={clearDeepLinkRecord} />
    },
    {
      label: 'Deals',
      icon: <IconBriefcase stroke={1.5} size="20px" />,
      component: <DealsTab deepLinkRecordId={tabParam === 'deals' ? recordId : null} onDeepLinkHandled={clearDeepLinkRecord} />
    },
    { label: 'Tasks', icon: <IconChecklist stroke={1.5} size="20px" />, component: <TasksTab /> },
    { label: 'Notes', icon: <IconNotes stroke={1.5} size="20px" />, component: <NotesTab /> }
  ];

  return (
    <MainCard title="Customer Relationship Management">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="CRM tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem'
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.icon}
                  <Typography variant="body2">{tab.label}</Typography>
                </Box>
              }
              {...a11yProps(index)}
            />
          ))}
        </Tabs>
      </Box>

      {tabs.map((tab, index) => (
        <TabPanel key={index} value={value} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </MainCard>
  );
}
