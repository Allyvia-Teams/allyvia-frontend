import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { IconPlus, IconEdit, IconTrash, IconEye, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import CompanyFormDialog from 'ui-component/dialogs/CompanyFormDialog';
import CompanyDeleteDialog from 'ui-component/dialogs/CompanyDeleteDialog';

import { fetchCompanies, deleteCompany, createCompany, updateCompany } from 'store/slices/company';
import { CompanyWithRole } from 'types/company';
import { useTheme } from '@mui/material/styles';

export default function CompanyDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { companies, isLoading, isCreating, isUpdating, isDeleting } = useSelector((state) => state.company);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithRole | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    dispatch(fetchCompanies());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCompanies());
  };

  const handleCreateClick = () => {
    setSelectedCompany(null);
    setIsEditMode(false);
    setFormOpen(true);
  };

  const handleEditClick = (company: CompanyWithRole) => {
    setSelectedCompany(company);
    setIsEditMode(true);
    setFormOpen(true);
  };

  const handleDeleteClick = (company: CompanyWithRole) => {
    setSelectedCompany(company);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (name: string) => {
    if (isEditMode && selectedCompany) {
      await dispatch(updateCompany({ id: selectedCompany.id, name }));
    } else {
      await dispatch(createCompany(name));
    }
    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedCompany) {
      await dispatch(deleteCompany(selectedCompany.id));
      setDeleteOpen(false);
    }
  };

  const getRoleChip = (role: string) => {
    const isAdmin = role === 'admin';
    return (
      <Chip
        label={isAdmin ? 'Admin' : 'Member'}
        size="small"
        color={isAdmin ? 'primary' : 'default'}
        variant={isAdmin ? 'filled' : 'outlined'}
      />
    );
  };

  const getQuickBooksStatus = (company: CompanyWithRole) => {
    if (company.is_connected_to_quickbooks) {
      return <Chip label="Connected" size="small" color="success" variant="outlined" />;
    }
    return <Chip label="Not Connected" size="small" color="default" variant="outlined" />;
  };

  return (
    <MainCard
      title="Companies & Workspaces"
      secondary={
        <Stack direction="row" spacing={1}>
          <AnimateButton>
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={handleCreateClick}
              size="small"
              disabled={isCreating || isUpdating || isDeleting}
              sx={{
                py: 0.5,
                px: 1.5,
                fontSize: '0.8125rem'
              }}
            >
              Add Company
            </Button>
          </AnimateButton>
          <IconButton onClick={handleRefresh} size="small" disabled={isLoading || isCreating || isUpdating || isDeleting}>
            <IconRefresh />
          </IconButton>
        </Stack>
      }
    >
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : companies.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="textSecondary">
            No companies found. Create your first company to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>QuickBooks</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id} hover>
                  <TableCell>
                    <Typography variant="body1">{company.name}</Typography>
                  </TableCell>
                  <TableCell>{getRoleChip(company.user_role)}</TableCell>
                  <TableCell>{getQuickBooksStatus(company)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(company.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" color="primary">
                        <IconEye size={18} />
                      </IconButton>
                      {company.user_role === 'admin' && (
                        <>
                          <IconButton size="small" color="primary" onClick={() => handleEditClick(company)}>
                            <IconEdit size={18} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(company)}>
                            <IconTrash size={18} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CompanyFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialName={isEditMode ? selectedCompany?.name : ''}
        isEdit={isEditMode}
        isLoading={isEditMode ? isUpdating : isCreating}
      />

      <CompanyDeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        companyName={selectedCompany?.name || ''}
        isDeleting={isDeleting}
      />
    </MainCard>
  );
}
