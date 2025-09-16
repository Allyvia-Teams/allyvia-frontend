import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Grid, Button, Tab, Tabs, AppBar, Typography, Stack } from '@mui/material';
import EmployeesTable from 'views/dashboard/EmployeesTable';
import { gridSpacing, gridSpacingSm } from 'store/constant';
import SearchSection from 'layout/MainLayout/Header/SearchSection';
import { IconPlus, IconFileTypeCsv } from '@tabler/icons-react';
import FormControl from 'ui-component/extended/Form/FormControl';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import MainCard from 'ui-component/cards/MainCard';
import FormControlSelect from 'ui-component/extended/Form/FormControlSelect';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { inventoryWidgetsSm } from 'views/inventory/InventoryMock';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`action-tabpanel-${index}`}
      aria-labelledby={`action-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </Typography>
  );
}

function a11yProps(index: any) {
  return {
    id: `action-tab-${index}`,
    'aria-controls': `action-tabpanel-${index}`
  };
}

export default function EmployeesPageMock() {
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: unknown, newValue: number) => {
    setValue(newValue);
  };

  const employeeRoles = [
    { value: 'none', label: 'Select Role' },
    { value: 'sales-rep', label: 'Sales Associate' },
    { value: 'sales-rep-jr', label: 'Junior Sales Associate' },
    { value: 'csr', label: 'Customer Service Representative' }
  ];

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
        <Grid container rowSpacing={gridSpacing} columnSpacing={gridSpacing}>
          <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              valueVariant="h3"
              titleVariant="h4"
              value={'65'}
              title={'Total Employees'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              titleVariant="h4"
              valueVariant="h3"
              value={6}
              title={'Departments'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              titleVariant="h4"
              valueVariant="h3"
              value={12}
              title={'On Leave'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              valueVariant="h3"
              titleVariant="h4"
              value={5}
              title={'Pending Reviews'}
              isTaggable={false}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ sm: 12, lg: 9 }}>
        <Box
          sx={{
            position: 'relative',
            minHeight: 200
          }}
        >
          <AppBar position="static" color="transparent" elevation={0} sx={{ pl: 2 }}>
            <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="primary" aria-label="action tabs example">
              <Tab label="All Employees" {...a11yProps(0)} />
              <Tab label="Highest Earning" {...a11yProps(2)} />
              <Tab label="Under Review" {...a11yProps(3)} />
            </Tabs>
          </AppBar>
          <TabPanel value={value} index={0} dir={theme.direction}>
            <EmployeesTable maxHeight={428}>
              <Grid container sx={{ pt: 2 }} spacing={gridSpacingSm}>
                <Grid size={{ sm: 2, md: 4 }}>
                  <SearchSection autoCompleteGroups={['employees']} mdWidth={300} lgWidth={250} />
                </Grid>
                <Grid size={{ sm: 10, md: 8 }}>
                  <Grid container spacing={gridSpacingSm} sx={{ justifyContent: 'flex-end', pr: 2 }}>
                    <Grid>
                      <Button sx={{ bgcolor: theme.palette.primary.dark, height: 50, minWidth: 120 }} color={'inherit'}>
                        <IconPlus height={16} stroke={3} color="#ffff" />
                        <Typography color="#ffff">Add Employee</Typography>
                      </Button>
                    </Grid>
                    <Grid>
                      <Button sx={{ bgcolor: theme.palette.primary.dark, height: 50, minWidth: 120 }} color={'inherit'}>
                        <IconFileTypeCsv height={16} stroke={2} color="#ffff" />
                        <Typography color="#ffff">Import CSV</Typography>
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </EmployeesTable>
          </TabPanel>
          <TabPanel value={value} index={1} dir={theme.direction}>
            Item Two
          </TabPanel>
          <TabPanel value={value} index={2} dir={theme.direction}>
            Item Three
          </TabPanel>
        </Box>
      </Grid>
      <Grid size={3}>
        <MainCard title={'Add New Employee'} contentSX={{ py: 2 }}>
          <Stack gap={2}>
            <Box>
              <InputLabel>First Name</InputLabel>
              <FormControl placeholder="Jamie" />
            </Box>
            <Box>
              <InputLabel>Last Name</InputLabel>
              <FormControl placeholder="Smith" />
            </Box>
            <Box>
              <InputLabel>Phone</InputLabel>
              <FormControl placeholder={'(xxx) xxx-xxxx'} />
            </Box>
            <Box>
              <InputLabel>Email</InputLabel>
              <FormControl placeholder="example@mail.com" />
            </Box>
            <Box>
              <InputLabel>Address</InputLabel>
              <FormControl placeholder="1234 Holly Rd" />
            </Box>
            <Box>
              <InputLabel>Title</InputLabel>
              <FormControlSelect currencies={employeeRoles} selected={employeeRoles[0].value} />
            </Box>
            {/* <Box>
              <InputLabel>Start Date</InputLabel>
              <FormControl />
            </Box> */}
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}
