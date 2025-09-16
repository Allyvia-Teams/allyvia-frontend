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
const mockNotes = [
  {
    id: '1',
    title: 'Initial meeting with David Chen',
    content: 'Had a great initial meeting with David from Enterprise Solutions. They are looking for a comprehensive software solution to manage their growing operations. Key pain points include manual processes and lack of real-time reporting.',
    noteType: 'Meeting Notes',
    contact: {
      firstName: 'David',
      lastName: 'Chen',
      company: 'Enterprise Solutions'
    },
    createdBy: 'Admin User',
    createdAt: '2024-02-10'
  },
  {
    id: '2',
    title: 'Proposal feedback from Maria Garcia',
    content: 'Maria provided detailed feedback on our consulting proposal. They are particularly interested in the strategic planning component and want to explore additional training modules. Need to follow up with revised proposal by next week.',
    noteType: 'General',
    contact: {
      firstName: 'Maria',
      lastName: 'Garcia',
      company: 'Garcia Consulting'
    },
    createdBy: 'Sarah Johnson',
    createdAt: '2024-02-15'
  },
  {
    id: '3',
    title: 'Product demo for TechStartup',
    content: 'Conducted product demonstration for Alex and his team at TechStartup. They were impressed with the user interface and integration capabilities. Alex mentioned they need to discuss with their technical team before making a decision.',
    noteType: 'Meeting Notes',
    contact: {
      firstName: 'Alex',
      lastName: 'Turner',
      company: 'TechStartup Inc.'
    },
    createdBy: 'Mike Wilson',
    createdAt: '2024-02-20'
  },
  {
    id: '4',
    title: 'Contract negotiations with Retail Chain',
    content: 'Started contract negotiations with Lisa from Retail Chain Corp. They are requesting some modifications to the service level agreements and payment terms. Need to review with legal team and prepare counter-proposal.',
    noteType: 'General',
    contact: {
      firstName: 'Charlie',
      lastName: 'Davis',
      company: 'Retail Solutions'
    },
    createdBy: 'Sarah Johnson',
    createdAt: '2024-02-05'
  },
  {
    id: '5',
    title: 'Discovery call notes - Wilson Manufacturing',
    content: 'Initial discovery call with Tom Wilson from Wilson Manufacturing. They are experiencing challenges with their current manufacturing process management system. Looking for solutions to improve efficiency and reduce costs.',
    noteType: 'Call Log',
    contact: {
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'StartupXYZ'
    },
    createdBy: 'Mike Wilson',
    createdAt: '2024-01-25'
  }
];

const getNoteTypeColor = (type: string) => {
  switch (type) {
    case 'Meeting Notes':
      return 'primary';
    case 'Call Log':
      return 'info';
    case 'Email':
      return 'secondary';
    case 'General':
      return 'default';
    default:
      return 'default';
  }
};

// ==============================|| NOTES TAB ||============================== //

export default function NotesTab() {
  const [notes, setNotes] = useState(mockNotes);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };

  const noteStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalNotes = notes.length;
  const meetingNotes = notes.filter(n => n.noteType === 'Meeting Notes').length;
  const callLogs = notes.filter(n => n.noteType === 'Call Log').length;
  const generalNotes = notes.filter(n => n.noteType === 'General').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={totalNotes} title="Total Notes" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={meetingNotes} title="Meeting Notes" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={callLogs} title="Call Logs" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={generalNotes} title="General Notes" />
      </Grid>

      {/* Notes Table */}
      <Grid size={12}>
        <MainCard
          title="Notes"
          secondary={
            <Button
              variant="contained"
              startIcon={<IconPlus stroke={1.5} size="20px" />}
              sx={{ textTransform: 'none' }}
            >
              Add Note
            </Button>
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="notes table">
              <TableHead>
                <TableRow>
                  <TableCell>Note</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((note) => (
                  <TableRow key={note.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">
                          {note.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {note.content}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {note.contact.firstName[0]}{note.contact.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {note.contact.firstName} {note.contact.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {note.contact.company}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={note.noteType}
                        color={getNoteTypeColor(note.noteType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{note.createdBy}</TableCell>
                    <TableCell>{note.createdAt}</TableCell>
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
                            onClick={() => handleDeleteNote(note.id)}
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
            count={notes.length}
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