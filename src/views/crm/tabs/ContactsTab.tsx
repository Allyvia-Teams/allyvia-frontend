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
const mockContacts = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@techsolutions.com',
    phone: '555-0123',
    company: 'Tech Solutions Inc.',
    jobTitle: 'CEO',
    contactType: 'Customer',
    status: 'Active',
    assignedTo: 'Admin User',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@enterprise.com',
    phone: '555-0124',
    company: 'Enterprise Corp',
    jobTitle: 'CTO',
    contactType: 'Lead',
    status: 'Active',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@startup.com',
    phone: '555-0125',
    company: 'StartupXYZ',
    jobTitle: 'Founder',
    contactType: 'Prospect',
    status: 'Active',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-25'
  },
  {
    id: '4',
    firstName: 'Alice',
    lastName: 'Brown',
    email: 'alice.brown@consulting.com',
    phone: '555-0126',
    company: 'Consulting Partners',
    jobTitle: 'Partner',
    contactType: 'Customer',
    status: 'Active',
    assignedTo: 'Admin User',
    createdAt: '2024-01-30'
  },
  {
    id: '5',
    firstName: 'Charlie',
    lastName: 'Davis',
    email: 'charlie.davis@retail.com',
    phone: '555-0127',
    company: 'Retail Solutions',
    jobTitle: 'VP Sales',
    contactType: 'Lead',
    status: 'Active',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-05'
  },
  {
    id: '6',
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@enterprise.com',
    phone: '555-0128',
    company: 'Enterprise Solutions',
    jobTitle: 'VP Technology',
    contactType: 'Customer',
    status: 'Active',
    assignedTo: 'Admin User',
    createdAt: '2024-02-10'
  },
  {
    id: '7',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@consulting.com',
    phone: '555-0129',
    company: 'Garcia Consulting',
    jobTitle: 'Managing Director',
    contactType: 'Lead',
    status: 'Active',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-02-15'
  },
  {
    id: '8',
    firstName: 'Alex',
    lastName: 'Turner',
    email: 'alex.turner@techstartup.com',
    phone: '555-0130',
    company: 'TechStartup Inc.',
    jobTitle: 'Founder',
    contactType: 'Prospect',
    status: 'Active',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-20'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Inactive':
      return 'error';
    default:
      return 'default';
  }
};

const getContactTypeColor = (type: string) => {
  switch (type) {
    case 'Customer':
      return 'primary';
    case 'Lead':
      return 'warning';
    case 'Prospect':
      return 'info';
    default:
      return 'default';
  }
};

// ==============================|| CONTACTS TAB ||============================== //

export default function ContactsTab() {
  const [contacts, setContacts] = useState(mockContacts);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteContact = (contactId: string) => {
    setContacts(contacts.filter(contact => contact.id !== contactId));
  };

  const contactStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalContacts = contacts.length;
  const customers = contacts.filter(c => c.contactType === 'Customer').length;
  const leads = contacts.filter(c => c.contactType === 'Lead').length;
  const active = contacts.filter(c => c.status === 'Active').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...contactStats} value={totalContacts} title="Total Contacts" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...contactStats} value={customers} title="Customers" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...contactStats} value={leads} title="Leads" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...contactStats} value={active} title="Active" />
      </Grid>

      {/* Contacts Table */}
      <Grid size={12}>
        <MainCard
          title="Contacts"
          secondary={
            <Button
              variant="contained"
              startIcon={<IconPlus stroke={1.5} size="20px" />}
              sx={{ textTransform: 'none' }}
            >
              Add Contact
            </Button>
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="contacts table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {contact.firstName[0]}{contact.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">
                            {contact.firstName} {contact.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {contact.jobTitle}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{contact.company}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone}</TableCell>
                    <TableCell>
                      <Chip
                        label={contact.contactType}
                        color={getContactTypeColor(contact.contactType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.status}
                        color={getStatusColor(contact.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{contact.assignedTo}</TableCell>
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
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
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
            count={contacts.length}
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