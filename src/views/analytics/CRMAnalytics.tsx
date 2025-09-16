import { useState, useMemo } from 'react';
import { format } from 'utils/dateUtils';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';

// material-ui
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Business,
  AttachMoney,
  Assessment,
  Phone,
  Email,
  Schedule,
  MoreVert,
  Visibility,
  VisibilityOff,
  Search,
  FilterList,
  DateRange,
  Category,
  LocationOn,
  Star,
  CheckCircle,
  Warning
} from '@mui/icons-material';

// third party
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { COLORS } from '../../styles/colors';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const MetricCard = ({ title, value, change, icon, color = 'primary', subtitle }: MetricCardProps) => (
  <Card sx={{ height: '100%', mb: 2 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" mt={1}>
              {subtitle}
            </Typography>
          )}
          {change !== undefined && (
            <Box display="flex" alignItems="center" mt={1}>
              {change >= 0 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
              <Typography variant="body2" color={change >= 0 ? 'success.main' : 'error.main'} ml={0.5}>
                {Math.abs(change)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

interface CRMAnalyticsProps {
  dateRange?: RangeValue;
  isLoading?: boolean;
  selectedChartType?: 'line' | 'area' | 'bar';
}

export const CRMAnalytics = ({ dateRange, isLoading, selectedChartType = 'line' }: CRMAnalyticsProps) => {
  const analyticsWidgetsSm = {
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('all');
  const [selectedOpportunityStage, setSelectedOpportunityStage] = useState('all');
  const [selectedActivityType, setSelectedActivityType] = useState('all');

  // Mock CRM data
  const mockCRMData = {
    total_contacts: 1247,
    total_leads: 89,
    total_opportunities: 45,
    total_activities: 234,
    leads_by_status: {
      new: 25,
      contacted: 18,
      qualified: 15,
      proposal: 12,
      negotiation: 8,
      closed_won: 11
    },
    leads_conversion_rate: 12.4,
    opportunities_by_stage: {
      prospecting: 8,
      qualification: 12,
      proposal: 10,
      negotiation: 8,
      closed_won: 7
    },
    total_pipeline_value: 1250000,
    weighted_pipeline_value: 875000,
    overdue_activities: 12,
    activities_by_type: {
      call: 45,
      email: 78,
      meeting: 23,
      follow_up: 34,
      demo: 15,
      proposal: 12,
      other: 27
    },
    recent_contacts: [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        company: 'Tech Corp',
        status: 'active',
        created_at: '2024-01-15'
      },
      {
        id: 2,
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah@example.com',
        company: 'Marketing Inc',
        status: 'prospect',
        created_at: '2024-01-14'
      },
      {
        id: 3,
        first_name: 'Mike',
        last_name: 'Davis',
        email: 'mike@example.com',
        company: 'Sales Co',
        status: 'lead',
        created_at: '2024-01-13'
      },
      {
        id: 4,
        first_name: 'Lisa',
        last_name: 'Wilson',
        email: 'lisa@example.com',
        company: 'Consulting LLC',
        status: 'customer',
        created_at: '2024-01-12'
      },
      {
        id: 5,
        first_name: 'David',
        last_name: 'Brown',
        email: 'david@example.com',
        company: 'Startup XYZ',
        status: 'active',
        created_at: '2024-01-11'
      }
    ],
    upcoming_activities: [
      {
        id: 1,
        subject: 'Follow up call',
        activity_type: 'call',
        due_date: '2024-01-16',
        priority: 'high',
        contact__first_name: 'John',
        contact__last_name: 'Smith',
        status: 'pending'
      },
      {
        id: 2,
        subject: 'Product demo',
        activity_type: 'demo',
        due_date: '2024-01-17',
        priority: 'medium',
        contact__first_name: 'Sarah',
        contact__last_name: 'Johnson',
        status: 'scheduled'
      },
      {
        id: 3,
        subject: 'Contract review',
        activity_type: 'meeting',
        due_date: '2024-01-18',
        priority: 'high',
        contact__first_name: 'Mike',
        contact__last_name: 'Davis',
        status: 'pending'
      },
      {
        id: 4,
        subject: 'Proposal sent',
        activity_type: 'proposal',
        due_date: '2024-01-19',
        priority: 'medium',
        contact__first_name: 'Lisa',
        contact__last_name: 'Wilson',
        status: 'completed'
      },
      {
        id: 5,
        subject: 'Discovery call',
        activity_type: 'call',
        due_date: '2024-01-20',
        priority: 'low',
        contact__first_name: 'David',
        contact__last_name: 'Brown',
        status: 'scheduled'
      }
    ],
    leads_list: [
      { id: 1, name: 'John Smith', company: 'Tech Corp', status: 'new', source: 'Website', value: 50000, created_at: '2024-01-15' },
      {
        id: 2,
        name: 'Sarah Johnson',
        company: 'Marketing Inc',
        status: 'contacted',
        source: 'Referral',
        value: 75000,
        created_at: '2024-01-14'
      },
      { id: 3, name: 'Mike Davis', company: 'Sales Co', status: 'qualified', source: 'Cold Call', value: 100000, created_at: '2024-01-13' },
      {
        id: 4,
        name: 'Lisa Wilson',
        company: 'Consulting LLC',
        status: 'proposal',
        source: 'Trade Show',
        value: 125000,
        created_at: '2024-01-12'
      },
      {
        id: 5,
        name: 'David Brown',
        company: 'Startup XYZ',
        status: 'negotiation',
        source: 'Website',
        value: 80000,
        created_at: '2024-01-11'
      },
      {
        id: 6,
        name: 'Emma Taylor',
        company: 'Design Studio',
        status: 'closed_won',
        source: 'Referral',
        value: 60000,
        created_at: '2024-01-10'
      },
      { id: 7, name: 'Alex Chen', company: 'Tech Startup', status: 'new', source: 'Social Media', value: 90000, created_at: '2024-01-09' },
      {
        id: 8,
        name: 'Maria Garcia',
        company: 'Consulting Firm',
        status: 'contacted',
        source: 'Cold Call',
        value: 110000,
        created_at: '2024-01-08'
      }
    ],
    opportunities_list: [
      {
        id: 1,
        name: 'Enterprise Software Deal',
        company: 'Tech Corp',
        stage: 'prospecting',
        value: 500000,
        probability: 20,
        expected_close: '2024-03-15'
      },
      {
        id: 2,
        name: 'Marketing Campaign',
        company: 'Marketing Inc',
        stage: 'qualification',
        value: 75000,
        probability: 40,
        expected_close: '2024-02-28'
      },
      {
        id: 3,
        name: 'Sales Training',
        company: 'Sales Co',
        stage: 'proposal',
        value: 100000,
        probability: 60,
        expected_close: '2024-02-15'
      },
      {
        id: 4,
        name: 'Consulting Project',
        company: 'Consulting LLC',
        stage: 'negotiation',
        value: 125000,
        probability: 80,
        expected_close: '2024-01-30'
      },
      {
        id: 5,
        name: 'Software License',
        company: 'Startup XYZ',
        stage: 'closed_won',
        value: 80000,
        probability: 100,
        expected_close: '2024-01-20'
      },
      {
        id: 6,
        name: 'Design Services',
        company: 'Design Studio',
        stage: 'closed_won',
        value: 60000,
        probability: 100,
        expected_close: '2024-01-18'
      },
      {
        id: 7,
        name: 'Tech Implementation',
        company: 'Tech Startup',
        stage: 'prospecting',
        value: 90000,
        probability: 25,
        expected_close: '2024-04-15'
      },
      {
        id: 8,
        name: 'Business Analysis',
        company: 'Consulting Firm',
        stage: 'qualification',
        value: 110000,
        probability: 50,
        expected_close: '2024-03-30'
      }
    ],
    crm_trend: [
      { month: 'Jan', new_leads: 15, converted_leads: 8, pipeline_value: 1100000, closed_deals: 5 },
      { month: 'Feb', new_leads: 18, converted_leads: 10, pipeline_value: 1150000, closed_deals: 6 },
      { month: 'Mar', new_leads: 20, converted_leads: 12, pipeline_value: 1200000, closed_deals: 7 },
      { month: 'Apr', new_leads: 22, converted_leads: 14, pipeline_value: 1220000, closed_deals: 8 },
      { month: 'May', new_leads: 25, converted_leads: 16, pipeline_value: 1240000, closed_deals: 9 },
      { month: 'Jun', new_leads: 28, converted_leads: 18, pipeline_value: 1250000, closed_deals: 10 },
      { month: 'Jul', new_leads: 30, converted_leads: 20, pipeline_value: 1250000, closed_deals: 11 }
    ]
  };

  const crm = mockCRMData;

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    let filtered = crm.leads_list;

    if (searchTerm) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLeadStatus !== 'all') {
      filtered = filtered.filter((lead) => lead.status === selectedLeadStatus);
    }

    return filtered;
  }, [crm.leads_list, searchTerm, selectedLeadStatus]);

  // Filter opportunities based on search and filters
  const filteredOpportunities = useMemo(() => {
    let filtered = crm.opportunities_list;

    if (searchTerm) {
      filtered = filtered.filter(
        (opportunity) =>
          opportunity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opportunity.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedOpportunityStage !== 'all') {
      filtered = filtered.filter((opportunity) => opportunity.stage === selectedOpportunityStage);
    }

    return filtered;
  }, [crm.opportunities_list, searchTerm, selectedOpportunityStage]);

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    grid: { show: true },
    colors: [COLORS.primaryBlue, COLORS.orange500, COLORS.lightGreen500, COLORS.red500, COLORS.deepPurple900],
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };

  // CRM trend data
  const crmTrendData = crm.crm_trend.map((item) => ({
    x: item.month,
    new_leads: item.new_leads,
    converted_leads: item.converted_leads,
    pipeline_value: item.pipeline_value,
    closed_deals: item.closed_deals
  }));

  // Opportunity stage data
  const opportunityStageData = [
    { x: 'PROSPECTING', y: 8 },
    { x: 'QUALIFICATION', y: 12 },
    { x: 'PROPOSAL', y: 10 },
    { x: 'NEGOTIATION', y: 8 },
    { x: 'CLOSED WON', y: 7 }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Key CRM Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Key CRM Metrics
      </Typography>
      <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={crm.total_contacts.toLocaleString()} title="Total Contacts" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={crm.total_leads.toLocaleString()} title="Active Leads" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${crm.total_pipeline_value.toLocaleString()}`} title="Pipeline Value" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`${crm.leads_conversion_rate}%`} title="Conversion Rate" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: 600 }}>
          <MainCard title="CRM Trend">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: crmTrendData.map((item) => item.x)
                }
              }}
              series={[
                { name: 'New Leads', data: crmTrendData.map((item) => item.new_leads) },
                { name: 'Converted Leads', data: crmTrendData.map((item) => item.converted_leads) },
                { name: 'Pipeline Value', data: crmTrendData.map((item) => item.pipeline_value / 10000) },
                { name: 'Closed Deals', data: crmTrendData.map((item) => item.closed_deals) }
              ]}
              type={selectedChartType}
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Activity Distribution">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%'
                    }
                  }
                }
              }}
              series={crm.activities_by_type ? Object.values(crm.activities_by_type) : []}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Charts Row 2 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <MainCard title="Lead Conversion Funnel">
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Conversion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { stage: 'NEW', count: crm.leads_by_status.new },
                    { stage: 'CONTACTED', count: crm.leads_by_status.contacted },
                    { stage: 'QUALIFIED', count: crm.leads_by_status.qualified },
                    { stage: 'PROPOSAL', count: crm.leads_by_status.proposal },
                    { stage: 'NEGOTIATION', count: crm.leads_by_status.negotiation },
                    { stage: 'CLOSED WON', count: crm.leads_by_status.closed_won }
                  ].map((row, index) => {
                    const conversionRate = index === 0 ? 100 : ((row.count / (crm.leads_by_status.new || 1)) * 100).toFixed(1);
                    return (
                      <TableRow key={row.stage}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={row.stage} size="small" color={index === 5 ? 'success' : 'default'} />
                          </Box>
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">{conversionRate}%</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={parseFloat(conversionRate.toString())}
                              sx={{ width: 60, height: 6 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Opportunity Stages">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%'
                    }
                  }
                }
              }}
              series={[8, 12, 10, 8, 7]}
              type="pie"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Leads Management with Filters */}
      <MainCard title="Leads Management" sx={{ mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lead Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setSelectedLeadStatus('all');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lead</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="center">Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {lead.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {lead.company}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={lead.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={
                        lead.status === 'closed_won'
                          ? 'success'
                          : lead.status === 'new'
                            ? 'default'
                            : lead.status === 'contacted'
                              ? 'primary'
                              : lead.status === 'qualified'
                                ? 'info'
                                : lead.status === 'proposal'
                                  ? 'warning'
                                  : 'secondary'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {lead.source}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      ${lead.value.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      {/* Opportunities and Activities */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Recent Contacts">
            <List>
              {crm.recent_contacts?.slice(0, 5).map((contact) => (
                <ListItem key={contact.id} divider>
                  <ListItemAvatar>
                    <Avatar>{contact.first_name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={`${contact.first_name} ${contact.last_name}`} secondary={contact.company || contact.email} />
                  <Chip
                    label={contact.status}
                    size="small"
                    color={
                      contact.status === 'customer'
                        ? 'success'
                        : contact.status === 'lead'
                          ? 'primary'
                          : contact.status === 'prospect'
                            ? 'warning'
                            : 'default'
                    }
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Upcoming Activities">
            <List>
              {crm.upcoming_activities?.slice(0, 5).map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemAvatar>
                    <Avatar>
                      {activity.activity_type === 'call' ? (
                        <Phone />
                      ) : activity.activity_type === 'email' ? (
                        <Email />
                      ) : activity.activity_type === 'meeting' ? (
                        <Schedule />
                      ) : (
                        <Business />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.subject}
                    secondary={`${activity.contact__first_name} ${activity.contact__last_name} - ${format(new Date(activity.due_date), 'MMM dd, yyyy')}`}
                  />
                  <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                    <Chip
                      label={activity.priority}
                      size="small"
                      color={activity.priority === 'high' ? 'error' : activity.priority === 'medium' ? 'warning' : 'default'}
                    />
                    <Chip
                      label={activity.status}
                      size="small"
                      color={activity.status === 'completed' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>
      </Box>
    </Box>
  );
};
