import React, { useState, useEffect } from 'react';

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
  Alert,
  Snackbar
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { COLORS } from '../styles/colors';
import { googleDriveAPI } from 'api/googleDrive.api';
import {
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleDriveConnectionStatus,
  DocumentFilters,
  UploadDocumentData,
  ShareDocumentData
} from 'types/documents';

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
  IconStarFilled,
  IconFolderPlus
} from '@tabler/icons-react';

interface DocumentsManagerProps {
  connectionStatus: GoogleDriveConnectionStatus;
  refreshTrigger?: number; // added for fixing the delete sync
}

export default function DocumentsManager({ connectionStatus, refreshTrigger }: DocumentsManagerProps) {
  const [documents, setDocuments] = useState<GoogleDriveFile[]>([]);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<GoogleDriveFile | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string>('');
  const [uploadRelatedTo, setUploadRelatedTo] = useState<string>('');

  // Share form state
  const [shareEmails, setShareEmails] = useState<string>('');
  const [sharePermission, setSharePermission] = useState<'viewer' | 'commenter' | 'writer'>('viewer');
  const [shareMessage, setShareMessage] = useState<string>('');

  // New folder form state
  const [newFolderName, setNewFolderName] = useState<string>('');

  useEffect(() => {
    loadDocuments();
    loadFolders();
  }, [selectedFolder, refreshTrigger]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const filters: DocumentFilters = {
        search: searchTerm || undefined,
        folder_id: selectedFolder || undefined
      };
      const docs = await googleDriveAPI.getDocuments(filters);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const folderList = await googleDriveAPI.getFolders();
      setFolders(folderList);
    } catch (err: any) {
      console.error('Failed to load folders:', err);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
    setUploadFile(null);
    setUploadFolderId(selectedFolder);
    setUploadRelatedTo('');
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadFile(null);
    setUploadFolderId('');
    setUploadRelatedTo('');
  };

  const handleOpenShareDialog = (document: GoogleDriveFile) => {
    setSelectedDocument(document);
    setOpenShareDialog(true);
    setShareEmails('');
    setSharePermission('viewer');
    setShareMessage('');
  };

  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
    setSelectedDocument(null);
    setShareEmails('');
    setSharePermission('viewer');
    setShareMessage('');
  };

  const handleOpenFolderDialog = () => {
    setOpenFolderDialog(true);
    setNewFolderName('');
  };

  const handleCloseFolderDialog = () => {
    setOpenFolderDialog(false);
    setNewFolderName('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = googleDriveAPI.validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadData: UploadDocumentData = {
        file: uploadFile,
        folder_id: uploadFolderId || undefined,
        related_to: uploadRelatedTo || undefined
      };

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const newDocument = await googleDriveAPI.uploadDocument(uploadData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setDocuments([newDocument, ...documents]);
        handleCloseUploadDialog();
        setSuccess('File uploaded successfully');
        loadDocuments(); // Refresh the list
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // old
  // const handleDownload = async (document: GoogleDriveFile) => {
  //   try {
  //     const response = await googleDriveAPI.downloadDocument(document.id);
  //     window.open(response.download_url, '_blank');
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to download file');
  //   }
  // };

  const handleDownload = async (document: GoogleDriveFile) => {
    try {
      await googleDriveAPI.downloadDocument(document.id, document.name);
    } catch (error) {
      console.error('Download failed:', error);
      // Show error message to user
    }
  };

  const handleShare = async () => {
    if (!selectedDocument || !shareEmails.trim()) {
      setError('Please enter email addresses to share with');
      return;
    }

    try {
      const emails = shareEmails
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email);
      const shareData: ShareDocumentData = {
        document_id: selectedDocument.id,
        emails,
        permission: sharePermission,
        message: shareMessage || undefined
      };

      const response = await googleDriveAPI.shareDocument(shareData);
      handleCloseShareDialog();
      setSuccess(`Document shared successfully. Share link: ${response.share_url}`);
    } catch (err: any) {
      setError(err.message || 'Failed to share document');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await googleDriveAPI.deleteDocument(documentId);
      setDocuments(documents.filter((doc) => doc.id !== documentId));
      setSuccess('Document deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      const newFolder = await googleDriveAPI.createFolder(newFolderName, selectedFolder || undefined);
      setFolders([...folders, newFolder]);
      handleCloseFolderDialog();
      setSuccess('Folder created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <IconFile stroke={1.5} size="20px" />;
    if (type.includes('word') || type.includes('doc')) return <IconFileText stroke={1.5} size="20px" />;
    if (type.includes('excel') || type.includes('sheet')) return <IconFileSpreadsheet stroke={1.5} size="20px" />;
    if (type.includes('powerpoint') || type.includes('presentation')) return <IconFile stroke={1.5} size="20px" />;
    return <IconFile stroke={1.5} size="20px" />;
  };

  const getFileTypeColor = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'error';
    if (type.includes('word') || type.includes('doc')) return 'primary';
    if (type.includes('excel') || type.includes('sheet')) return 'success';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'warning';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const documentStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
  const starredDocuments = 0; // Will be implemented when backend supports starring
  const recentUploads = documents.filter((doc) => {
    const uploadDate = new Date(doc.uploaded_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate > weekAgo;
  }).length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={totalDocuments} title="Total Documents" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...documentStats} value={googleDriveAPI.formatFileSize(totalSize)} title="Total Size" />
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
              <Button
                variant="contained"
                startIcon={<IconFolderPlus stroke={1.5} size="20px" />}
                sx={{ textTransform: 'none' }}
                onClick={handleOpenFolderDialog}
              >
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
                onKeyPress={(e) => e.key === 'Enter' && loadDocuments()}
                InputProps={{
                  startAdornment: <IconFile stroke={1.5} size="20px" style={{ marginRight: 8 }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Folder</InputLabel>
                <Select value={selectedFolder} label="Folder" onChange={(e) => setSelectedFolder(e.target.value)}>
                  <MenuItem value="">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconFolder size={16} />
                      <Typography>All Files</Typography>
                    </Stack>
                  </MenuItem>
                  {folders.map((folder) => (
                    <MenuItem key={folder.id} value={folder.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconFolder size={16} />
                        <Typography>{folder.name}</Typography>
                        <Chip label={folder.file_count} size="small" />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button variant="outlined" onClick={loadDocuments} disabled={loading} sx={{ textTransform: 'none' }}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
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
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((document) => (
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
                          {getFileTypeIcon(document.file_type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {document.name}
                            {document.is_shared && <IconShare size={16} color={COLORS.blue700} />}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={document.file_type.toUpperCase()} color={getFileTypeColor(document.file_type) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{googleDriveAPI.formatFileSize(document.file_size)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.folder || 'Root'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.related_to || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{document.uploaded_by}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(document.last_modified)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => handleDownload(document)} sx={{ color: 'primary.main' }}>
                            <IconDownload stroke={1.5} size="18px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share">
                          <IconButton size="small" onClick={() => handleOpenShareDialog(document)} sx={{ color: 'secondary.main' }}>
                            <IconShare stroke={1.5} size="18px" />
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
            count={documents.length}
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
            <Alert severity="info">Supported file types: PDF, DOCX, XLSX, PPTX. Maximum file size: 25MB.</Alert>

            <FormControl fullWidth>
              <InputLabel>Folder</InputLabel>
              <Select value={uploadFolderId} label="Folder" onChange={(e) => setUploadFolderId(e.target.value)}>
                <MenuItem value="">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconFolder size={16} />
                    <Typography>Root Folder</Typography>
                  </Stack>
                </MenuItem>
                {folders.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconFolder size={16} />
                      <Typography>{folder.name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Related To"
              placeholder="Contact or company name (optional)"
              value={uploadRelatedTo}
              onChange={(e) => setUploadRelatedTo(e.target.value)}
            />

            <Box sx={{ border: '2px dashed', borderColor: 'grey.300', borderRadius: 1, p: 3, textAlign: 'center' }}>
              <IconUpload stroke={2} size={48} style={{ marginBottom: 16, color: COLORS.grey666 }} />
              <Typography variant="h6" gutterBottom>
                {uploadFile ? uploadFile.name : 'Drop files here or click to browse'}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Support for PDF, DOCX, XLSX, PPTX files only
              </Typography>
              <input type="file" accept=".pdf,.docx,.xlsx,.pptx" onChange={handleFileSelect} style={{ display: 'none' }} id="file-upload" />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" sx={{ mt: 1 }}>
                  Choose File
                </Button>
              </label>
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
          <Button onClick={handleCloseUploadDialog} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={isUploading || !uploadFile}
            startIcon={<IconUpload stroke={1.5} size="20px" />}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedDocument?.name}
            </Typography>

            <TextField
              fullWidth
              label="Share with"
              placeholder="Enter email addresses (comma-separated)"
              multiline
              rows={3}
              value={shareEmails}
              onChange={(e) => setShareEmails(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Permission</InputLabel>
              <Select
                value={sharePermission}
                label="Permission"
                onChange={(e) => setSharePermission(e.target.value as 'viewer' | 'commenter' | 'writer')}
              >
                <MenuItem value="viewer">Can view</MenuItem>
                <MenuItem value="writer">Can edit</MenuItem>
                <MenuItem value="commenter">Can comment</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Message (optional)"
              placeholder="Add a message to your invitation"
              multiline
              rows={2}
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleShare} startIcon={<IconShare stroke={1.5} size="20px" />}>
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={openFolderDialog} onClose={handleCloseFolderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Folder Name"
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Parent Folder</InputLabel>
              <Select value={selectedFolder} label="Parent Folder" onChange={(e) => setSelectedFolder(e.target.value)}>
                <MenuItem value="">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconFolder size={16} />
                    <Typography>Root Folder</Typography>
                  </Stack>
                </MenuItem>
                {folders.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconFolder size={16} />
                      <Typography>{folder.name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFolderDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFolder} startIcon={<IconFolderPlus stroke={1.5} size="20px" />}>
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error/Success Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Grid>
  );
}
