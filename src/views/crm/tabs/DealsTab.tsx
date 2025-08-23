import { useState } from 'react';

// material-ui
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';

// assets
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';

// Mock data
const mockDeals = [
  {
    id: '1',
    name: 'Enterprise Software License',
    contact: {
      firstName: 'David',
      lastName: 'Chen',
      company: 'Enterprise Solutions',
      jobTitle: 'VP Technology'
    },
    description: 'Comprehensive software license for enterprise operations',
    value: 150000,
    currency: 'USD',
    stage: 'Proposal',
    probability: 75,
    expectedCloseDate: '2024-03-20',
    assignedTo: 'Admin User',
    productsServices: 'Premium Software Suite',
    createdAt: '2024-02-10'
  },
  {
    id: '2',
    name: 'Consulting Services Contract',
    contact: {
      firstName: 'Alice',
      lastName: 'Brown',
      company: 'Consulting Partners',
      jobTitle: 'Partner'
    },
    description: 'Strategic consulting services for business transformation',
    value: 85000,
    currency: 'USD',
    stage: 'Negotiation',
    probability: 90,
    expectedCloseDate: '2024-03-30',
    assignedTo: 'Sarah Johnson',
    productsServices: 'Strategic Consulting',
    createdAt: '2024-01-30'
  },
  {
    id: '3',
    name: 'Startup Technology Package',
    contact: {
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'StartupXYZ',
      jobTitle: 'Founder'
    },
    description: 'Technology package for early-stage startup',
    value: 45000,
    currency: 'USD',
    stage: 'Qualification',
    probability: 60,
    expectedCloseDate: '2024-04-15',
    assignedTo: 'Mike Wilson',
    productsServices: 'Basic Software Package',
    createdAt: '2024-01-25'
  },
  {
    id: '4',
    name: 'Retail Management System',
    contact: {
      firstName: 'Charlie',
      lastName: 'Davis',
      company: 'Retail Solutions',
      jobTitle: 'VP Sales'
    },
    description: 'Complete retail management solution',
    value: 75000,
    currency: 'USD',
    stage: 'Closed Won',
    probability: 100,
    expectedCloseDate: '2024-03-01',
    assignedTo: 'Sarah Johnson',
    productsServices: 'Retail Management Suite',
    createdAt: '2024-02-05'
  },
  {
    id: '5',
    name: 'Manufacturing Process Optimization',
    contact: {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Tech Solutions Inc.',
      jobTitle: 'CEO'
    },
    description: 'Process optimization for manufacturing operations',
    value: 120000,
    currency: 'USD',
    stage: 'Prospecting',
    probability: 40,
    expectedCloseDate: '2024-05-15',
    assignedTo: 'Admin User',
    productsServices: 'Process Optimization Tools',
    createdAt: '2024-01-15'
  }
];

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'Prospecting':
      return 'info';
    case 'Qualification':
      return 'warning';
    case 'Proposal':
      return 'primary';
    case 'Negotiation':
      return 'secondary';
    case 'Closed Won':
      return 'success';
    case 'Closed Lost':
      return 'error';
    default:
      return 'default';
  }
};

const getProbabilityColor = (probability: number) => {
  if (probability >= 80) return 'success';
  if (probability >= 60) return 'warning';
  if (probability >= 40) return 'info';
  return 'error';
};

// ==============================|| DEALS TAB ||============================== //

export default function DealsTab() {
  const [deals, setDeals] = useState(mockDeals);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteDeal = (dealId: string) => {
    setDeals(deals.filter((deal) => deal.id !== dealId));
  };

  const dealStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const wonDeals = deals.filter((d) => d.stage === 'Closed Won').length;
  const activeDeals = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={totalDeals} title="Total Deals" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={`$${(totalValue / 1000).toFixed(0)}k`} title="Total Value" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={wonDeals} title="Won Deals" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={activeDeals} title="Active Deals" />
      </Grid>

      {/* Deals Table */}
      <Grid size={12}>
        <MainCard
          title="Deals"
          secondary={
            <Button variant="contained" startIcon={<IconPlus stroke={1.5} size="20px" />} sx={{ textTransform: 'none' }}>
              Add Deal
            </Button>
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="deals table">
              <TableHead>
                <TableRow>
                  <TableCell>Deal Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((deal) => (
                  <TableRow key={deal.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{deal.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {deal.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {deal.contact.firstName[0]}
                          {deal.contact.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {deal.contact.company}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>${deal.value.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={deal.stage} color={getStageColor(deal.stage) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${deal.probability}%`} color={getProbabilityColor(deal.probability) as any} size="small" />
                    </TableCell>
                    <TableCell>{deal.expectedCloseDate}</TableCell>
                    <TableCell>{deal.assignedTo}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="View">
                          <IconButton size="small" color="primary">
                            <IconEye stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary">
                            <IconEdit stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteDeal(deal.id)}>
                            <IconTrash stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={deals.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </MainCard>
      </Grid>
    </Grid>
  );
}
