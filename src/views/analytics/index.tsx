import { useState, useEffect } from 'react';
import { parseDate } from '@internationalized/date';

// material-ui
import { Box, Tabs, Tab, Typography, Grid, useTheme, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// project imports
import { gridSpacing } from 'store/constant';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { DateValue } from 'react-aria';
import MainCard from 'ui-component/cards/MainCard';
import { MockAnalytics } from './MockAnalytics';
import { FinancialAnalytics } from './FinancialAnalytics';
import { EmployeeAnalytics } from './EmployeeAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { CRMAnalytics } from './CRMAnalytics';

// assets
import { IconChartBar, IconUsers, IconReportMoney, IconObjectScan, IconLifebuoy } from '@tabler/icons-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`analytics-tabpanel-${index}`} aria-labelledby={`analytics-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`
  };
}

// ISO 8601 date format
const LAST_WEEK = parseDate(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
const TODAY = parseDate(new Date().toISOString().split('T')[0]);

export default function AnalyticsPage() {
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [dateRange, setDateRange] = useState<RangeValue>({
    start: LAST_WEEK,
    end: TODAY
  });
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [isLoading, setIsLoading] = useState(true);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange((prev) => ({
      start: start ?? prev.start,
      end: end ?? prev.end
    }));
  };

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      {/* Analytics Content */}
      <Grid size={12}>
        <MainCard
          title="Analytics Dashboard"
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <AllyviaDateRangePicker
                value={dateRange}
                onChange={(value: RangeValue | null) => {
                  updateDateRange(value!.start, value!.end);
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={selectedChartType}
                  label="Chart Type"
                  onChange={(e) => setSelectedChartType(e.target.value as 'line' | 'area' | 'bar')}
                >
                  <MenuItem value="line">Line</MenuItem>
                  <MenuItem value="area">Area</MenuItem>
                  <MenuItem value="bar">Bar</MenuItem>
                </Select>
              </FormControl>
            </Box>
          }
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="analytics tabs"
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
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconChartBar stroke={1.5} size="20px" />
                      <Typography variant="body2">Overview</Typography>
                    </Box>
                  }
                  {...a11yProps(0)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconLifebuoy stroke={1.5} size="20px" />
                      <Typography variant="body2">CRM Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(1)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconReportMoney stroke={1.5} size="20px" />
                      <Typography variant="body2">Financial Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(2)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconUsers stroke={1.5} size="20px" />
                      <Typography variant="body2">Employee Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(3)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconObjectScan stroke={1.5} size="20px" />
                      <Typography variant="body2">Inventory Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(4)}
                />
              </Tabs>
            </Box>

            <TabPanel value={value} index={0}>
              <MockAnalytics dateRange={dateRange} isLoading={isLoading} selectedChartType={selectedChartType} />
            </TabPanel>

            <TabPanel value={value} index={1}>
              <CRMAnalytics dateRange={dateRange} isLoading={isLoading} selectedChartType={selectedChartType} />
            </TabPanel>

            <TabPanel value={value} index={2}>
              <FinancialAnalytics dateRange={dateRange} isLoading={isLoading} selectedChartType={selectedChartType} />
            </TabPanel>

            <TabPanel value={value} index={3}>
              <EmployeeAnalytics dateRange={dateRange} isLoading={isLoading} selectedChartType={selectedChartType} />
            </TabPanel>

            <TabPanel value={value} index={4}>
              <InventoryAnalytics dateRange={dateRange} isLoading={isLoading} selectedChartType={selectedChartType} />
            </TabPanel>
          </Box>
        </MainCard>
      </Grid>
    </Grid>
  );
}
