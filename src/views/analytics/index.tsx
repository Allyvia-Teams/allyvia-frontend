import { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { MockAnalytics } from './MockAnalytics';
import { FinancialAnalytics } from './FinancialAnalytics';
import { EmployeeAnalytics } from './EmployeeAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { CRMAnalytics } from './CRMAnalytics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

export default function AnalyticsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="analytics tabs">
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="CRM Analytics" {...a11yProps(1)} />
          <Tab label="Financial Analytics" {...a11yProps(2)} />
          <Tab label="Employee Analytics" {...a11yProps(3)} />
          <Tab label="Inventory Analytics" {...a11yProps(4)} />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <MockAnalytics />
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <CRMAnalytics />
      </TabPanel>
      
      <TabPanel value={value} index={2}>
        <FinancialAnalytics />
      </TabPanel>
      
      <TabPanel value={value} index={3}>
        <EmployeeAnalytics />
      </TabPanel>
      
      <TabPanel value={value} index={4}>
        <InventoryAnalytics />
      </TabPanel>
      

    </Box>
  );
} 