import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import AllyviaEmptyExamples from './AllyviaEmptyExamples';
import CommonComponentsPlayground from './CommonComponentsPlayground';

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
      id={`playground-tabpanel-${index}`}
      aria-labelledby={`playground-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `playground-tab-${index}`,
    'aria-controls': `playground-tabpanel-${index}`
  };
}

const PlaygroundPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="playground tabs" variant="fullWidth">
          <Tab label="AllyviaEmpty Examples" {...a11yProps(0)} />
          <Tab label="Common Components" {...a11yProps(1)} />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <AllyviaEmptyExamples />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <CommonComponentsPlayground />
      </TabPanel>
    </Box>
  );
};

export default PlaygroundPage;
