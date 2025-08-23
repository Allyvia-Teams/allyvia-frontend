import { useState } from 'react';

// material-ui
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { COLORS } from '../../../styles/colors';

// assets
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconDownload,
  IconUpload,
  IconFile,
  IconFileText,
  IconFileSpreadsheet,
  IconFileCode,
  IconPhoto,
  IconFolder,
  IconCloudUpload,
  IconShare,
  IconStar,
  IconStarFilled
} from '@tabler/icons-react';

// Mock data for documents
const mockDocuments = [
  {
    id: '1',
    name: 'Q4 Sales Proposal.pdf',
    type: 'PDF',
    size: '2.4 MB',
    category: 'Sales',
    relatedTo: 'David Chen',
    company: 'Enterprise Solutions',
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-02-20T10:30:00Z',
    lastModified: '2024-02-20T10:30:00Z',
    isStarred: true,
    isShared: false,
    downloadCount: 12,
    tags: ['Sales', 'Proposal', 'Q4']
  },
  {
    id: '2',
    name: 'Contract Template.docx',
    type: 'DOCX',
    size: '1.8 MB',
    category: 'Legal',
    relatedTo: 'Maria Garcia',
    company: 'Garcia Consulting',
    uploadedBy: 'Mike Wilson',
    uploadedAt: '2024-02-19T14:15:00Z',
    lastModified: '2024-02-21T09:45:00Z',
    isStarred: false,
    isShared: true,
    downloadCount: 8,
    tags: ['Template', 'Legal', 'Contract']
  },
  {
    id: '3',
    name: 'Product Demo Slides.pptx',
    type: 'PPTX',
    size: '15.2 MB',
    category: 'Presentations',
    relatedTo: 'Alex Turner',
    company: 'TechStartup Inc.',
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-02-18T16:00:00Z',
    lastModified: '2024-02-18T16:00:00Z',
    isStarred: true,
    isShared: false,
    downloadCount: 25,
    tags: ['Demo', 'Presentation', 'Product']
  },
  {
    id: '4',
    name: 'Customer Feedback Survey.xlsx',
    type: 'XLSX',
    size: '856 KB',
    category: 'Customer Support',
    relatedTo: 'Lisa Anderson',
    company: 'Retail Chain Corp',
    uploadedBy: 'Mike Wilson',
    uploadedAt: '2024-02-17T11:20:00Z',
    lastModified: '2024-02-20T15:30:00Z',
    isStarred: false,
    isShared: true,
    downloadCount: 5,
    tags: ['Survey', 'Feedback', 'Customer']
  },
  {
    id: '5',
    name: 'Technical Specifications.pdf',
    type: 'PDF',
    size: '4.1 MB',
    category: 'Engineering',
    relatedTo: 'Tom Wilson',
    company: 'Wilson Manufacturing',
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-02-16T13:45:00Z',
    lastModified: '2024-02-16T13:45:00Z',
    isStarred: false,
    isShared: false,
    downloadCount: 18,
    tags: ['Technical', 'Specs', 'Documentation']
  },
  {
    id: '6',
    name: 'Company Logo.png',
    type: 'PNG',
    size: '2.1 MB',
    category: 'Marketing',
    relatedTo: 'General',
    company: 'Internal',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2024-02-15T09:30:00Z',
    lastModified: '2024-02-15T09:30:00Z',
    isStarred: true,
    isShared: true,
    downloadCount: 45,
    tags: ['Logo', 'Branding', 'Marketing']
  },
  {
    id: '7',
    name: 'API Documentation.md',
    type: 'MD',
    size: '156 KB',
    category: 'Engineering',
    relatedTo: 'Development Team',
    company: 'Internal',
    uploadedBy: 'Dev Team',
    uploadedAt: '2024-02-14T16:20:00Z',
    lastModified: '2024-02-19T11:15:00Z',
    isStarred: false,
    isShared: true,
    downloadCount: 32,
    tags: ['API', 'Documentation', 'Technical']
  },
  {
    id: '8',
    name: 'Monthly Report March 2024.xlsx',
    type: 'XLSX',
    size: '3.2 MB',
    category: 'Finance',
    relatedTo: 'Management',
    company: 'Internal',
    uploadedBy: 'Finance Team',
    uploadedAt: '2024-02-13T14:00:00Z',
    lastModified: '2024-02-13T14:00:00Z',
    isStarred: false,
    isShared: false,
    downloadCount: 7,
    tags: ['Report', 'Monthly', 'Finance']
  },
  {
    id: '9',
    name: 'HR Policies.pdf',
    type: 'PDF',
    size: '1.2 MB',
    category: 'Human Resources',
    relatedTo: 'General',
    company: 'Internal',
    uploadedBy: 'HR Team',
    uploadedAt: '2024-02-12T10:00:00Z',
    lastModified: '2024-02-12T10:00:00Z',
    isStarred: false,
    isShared: true,
    downloadCount: 15,
    tags: ['HR', 'Policies', 'Internal']
  },
  {
    id: '10',
    name: 'Product Roadmap.pptx',
    type: 'PPTX',
    size: '8.5 MB',
    category: 'Product',
    relatedTo: 'Product Team',
    company: 'Internal',
    uploadedBy: 'Product Manager',
    uploadedAt: '2024-02-11T14:30:00Z',
    lastModified: '2024-02-11T14:30:00Z',
    isStarred: true,
    isShared: false,
    downloadCount: 28,
    tags: ['Product', 'Roadmap', 'Planning']
  }
];

const getFileTypeIcon = (type: string) => {
  switch (type) {
    case 'PDF':
      return <IconFile stroke={1.5} size="20px" />;
    case 'DOCX':
    case 'DOC':
      return <IconFileText stroke={1.5} size="20px" />;
    case 'XLSX':
    case 'XLS':
      return <IconFileSpreadsheet stroke={1.5} size="20px" />;
    case 'PPTX':
    case 'PPT':
      return <IconFile stroke={1.5} size="20px" />;
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
      return <IconPhoto stroke={1.5} size="20px" />;
    case 'MD':
    case 'TXT':
      return <IconFileCode stroke={1.5} size="20px" />;
    default:
      return <IconFile stroke={1.5} size="20px" />;
  }
};

const getFileTypeColor = (type: string) => {
  switch (type) {
    case 'PDF':
      return 'error';
    case 'DOCX':
    case 'DOC':
      return 'primary';
    case 'XLSX':
    case 'XLS':
      return 'success';
    case 'PPTX':
    case 'PPT':
      return 'warning';
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
      return 'info';
    case 'MD':
    case 'TXT':
      return 'secondary';
    default:
      return 'default';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Sales':
      return 'primary';
    case 'Legal':
      return 'success';
    case 'Presentations':
      return 'warning';
    case 'Customer Support':
      return 'info';
    case 'Engineering':
      return 'secondary';
    case 'Marketing':
      return 'error';
    case 'Finance':
      return 'default';
    case 'Human Resources':
      return 'primary';
    case 'Product':
      return 'warning';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatFileSize = (size: string) => {
  return size;
};

// ==============================|| DOCUMENTS TAB ||============================== //

export default function DocumentsTab() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleOpenShareDialog = (document: any) => {
    setSelectedDocument(document);
    setOpenShareDialog(true);
  };

  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
    setSelectedDocument(null);
  };

  const handleToggleStar = (documentId: string) => {
    setDocuments(documents.map((doc) => (doc.id === documentId ? { ...doc, isStarred: !doc.isStarred } : doc)));
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== documentId));
  };

  const handleDownload = (document: any) => {
    // Simulate download
    console.log('Downloading:', document.name);
    // In the future, this will integrate with Microsoft Graph API
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          handleCloseUploadDialog();
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleShare = () => {
    // Simulate sharing
    console.log('Sharing document:', selectedDocument?.name);
    handleCloseShareDialog();
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const documentStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => {
    const size = parseFloat(doc.size.replace(/[^\d.]/g, ''));
    return sum + size;
  }, 0);
  const starredDocuments = documents.filter((doc) => doc.isStarred).length;
  const recentUploads = documents.filter((doc) => {
    const uploadDate = new Date(doc.uploadedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate > weekAgo;
  }).length;

  const categories = ['all', ...Array.from(new Set(documents.map((doc) => doc.category)))];

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={totalDocuments} title="Total Documents" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={`${totalSize.toFixed(1)} MB`} title="Total Size" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={starredDocuments} title="Starred" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={recentUploads} title="Recent Uploads" />
      </Grid>

      {/* Documents Table */}
      <Grid size={12}>
        <MainCard
          title="Documents"
          secondary={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<IconCloudUpload stroke={1.5} size="20px" />}
                sx={{ textTransform: 'none' }}
                onClick={handleOpenUploadDialog}
              >
                Upload
              </Button>
              <Button variant="contained" startIcon={<IconPlus stroke={1.5} size="20px" />} sx={{ textTransform: 'none' }}>
                New Folder
              </Button>
            </Stack>
          }
        >
          {/* Filters and Search */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <IconFile stroke={1.5} size="20px" style={{ marginRight: 8 }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Folder</InputLabel>
                <Select value={filterCategory} label="Folder" onChange={(e) => setFilterCategory(e.target.value)}>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category === 'all' ? 'All Folders' : category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="documents table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Folder</TableCell>
                  <TableCell>Related To</TableCell>
                  <TableCell>Uploaded By</TableCell>
                  <TableCell>Last Modified</TableCell>
                  <TableCell>Downloads</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.light',
                            color: 'primary.dark',
                            width: 32,
                            height: 32
                          }}
                        >
                          {getFileTypeIcon(document.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {document.name}
                            {document.isStarred && <IconStarFilled size={16} color={COLORS.gold} />}
                            {document.isShared && <IconShare size={16} color={COLORS.blue700} />}
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            {document.tags.slice(0, 2).map((tag: string, index: number) => (
                              <Chip key={index} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem' }} />
                            ))}
                            {document.tags.length > 2 && (
                              <Chip
                                label={`+${document.tags.length - 2}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.75rem' }}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={document.type} color={getFileTypeColor(document.type) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatFileSize(document.size)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={document.category} color={getCategoryColor(document.category) as any} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.relatedTo}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {document.company}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.uploadedBy}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(document.lastModified)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.downloadCount}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => handleDownload(document)} sx={{ color: 'primary.main' }}>
                            <IconDownload stroke={1.5} size="18px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Preview">
                          <IconButton size="small" sx={{ color: 'info.main' }}>
                            <IconEye stroke={1.5} size="18px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share">
                          <IconButton size="small" onClick={() => handleOpenShareDialog(document)} sx={{ color: 'secondary.main' }}>
                            <IconShare stroke={1.5} size="18px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={document.isStarred ? 'Unstar' : 'Star'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStar(document.id)}
                            sx={{ color: document.isStarred ? COLORS.gold : 'text.secondary' }}
                          >
                            {document.isStarred ? <IconStarFilled stroke={1.5} size="18px" /> : <IconStar stroke={1.5} size="18px" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteDocument(document.id)} sx={{ color: 'error.main' }}>
                            <IconTrash stroke={1.5} size="18px" />
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
            count={filteredDocuments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </MainCard>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              In the future, this will integrate with Microsoft Graph API for seamless file uploads to OneDrive/SharePoint.
            </Alert>

            <TextField fullWidth label="Document Name" placeholder="Enter document name" />

            <FormControl fullWidth>
              <InputLabel>Folder</InputLabel>
              <Select label="Folder">
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Legal">Legal</MenuItem>
                <MenuItem value="Presentations">Presentations</MenuItem>
                <MenuItem value="Customer Support">Customer Support</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Human Resources">Human Resources</MenuItem>
                <MenuItem value="Product">Product</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Related To" placeholder="Contact or company name" />

            <Box sx={{ border: '2px dashed', borderColor: 'grey.300', borderRadius: 1, p: 3, textAlign: 'center' }}>
              <IconUpload stroke={2} size={48} style={{ marginBottom: 16, color: COLORS.grey666 }} />
              <Typography variant="h6" gutterBottom>
                Drop files here or click to browse
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Support for PDF, DOCX, XLSX, PPTX, images, and more
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }}>
                Choose Files
              </Button>
            </Box>

            {isUploading && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Uploading... {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleUpload} disabled={isUploading} startIcon={<IconUpload stroke={1.5} size="20px" />}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">In the future, this will integrate with Microsoft Graph API for sharing via OneDrive/SharePoint.</Alert>

            <Typography variant="subtitle1" gutterBottom>
              {selectedDocument?.name}
            </Typography>

            <TextField fullWidth label="Share with" placeholder="Enter email addresses" multiline rows={3} />

            <FormControl fullWidth>
              <InputLabel>Permission</InputLabel>
              <Select label="Permission" defaultValue="view">
                <MenuItem value="view">Can view</MenuItem>
                <MenuItem value="edit">Can edit</MenuItem>
                <MenuItem value="comment">Can comment</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Message (optional)" placeholder="Add a message to your invitation" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleShare} startIcon={<IconShare stroke={1.5} size="20px" />}>
            Share
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
