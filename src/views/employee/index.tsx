// Main Employee Management Page
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'store';
import {
  Grid,
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as IconPlus,
  FileDownload as IconFileTypeCsv,
  Visibility as IconView,
  Edit as IconEdit,
  Delete as IconDelete
} from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';
import { AllyviaPaginatedTable } from 'ui-component/common/AllyviaPaginatedTable';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { gridSpacing, xLargeWidgetHeight } from 'store/constant';
import { COLORS } from 'styles/colors';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  openEditModal,
  openDetailModal,
  openCSVImportModal,
  closeEditModal,
  closeDetailModal,
  closeCSVImportModal
} from 'store/slices/employee';
import { EmployeeStats } from 'ui-component/employee/EmployeeStats';
import { EmployeeForm } from 'ui-component/employee/EmployeeForm';
import { EmployeeEditModal } from 'ui-component/employee/EmployeeEditModal';
import { EmployeeDetailModal } from 'ui-component/employee/EmployeeDetailModal';
import { CSVImportModal } from 'ui-component/employee/CSVImportModal';
import { calculateEmployeeStats, getStatusColor, getStatusDisplayText } from 'utils/employeeUtils';
import { Employee, CreateEmployeeData, UpdateEmployeeData } from 'types/employee';

export default function EmployeeManagementPage() {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const { allEmployees, loading, error, isEditModalOpen, isDetailModalOpen, isCSVImportModalOpen, selectedEmployee } = useSelector(
    (state) => state.employee
  );

  // Local state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    employeeId: string | null;
    employeeName: string;
  }>({
    open: false,
    employeeId: null,
    employeeName: ''
  });

  // Load employees on component mount
  useEffect(() => {
    if (currentRole?.company_id) {
      dispatch(fetchEmployees());
    }
  }, [currentRole?.company_id, dispatch]);

  // Calculate stats for AllyviaStats
  const employeeStats = useMemo(() => {
    return calculateEmployeeStats(allEmployees);
  }, [allEmployees]);

  // Handle employee creation
  const handleCreateEmployee = async (formData: CreateEmployeeData) => {
    try {
      await dispatch(createEmployee(formData)).unwrap();
      showSnackbar('Employee created successfully!', 'success');
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to create employee', 'error');
    }
  };

  // Handle employee edit
  const handleEdit = (employee: Employee) => {
    dispatch(openEditModal(employee));
  };

  // Handle employee view details
  const handleViewDetails = (employee: Employee) => {
    dispatch(openDetailModal(employee));
  };

  // Handle employee update
  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      const updateData: UpdateEmployeeData = {
        first_name: updatedEmployee.first_name,
        last_name: updatedEmployee.last_name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        title: updatedEmployee.title,
        address: updatedEmployee.address,
        status: updatedEmployee.status,
        is_active: updatedEmployee.is_active
      };
      console.log('updateData', updateData);
      await dispatch(updateEmployee({ id: updatedEmployee.id, data: updateData })).unwrap();
      dispatch(closeEditModal());
      showSnackbar('Employee updated successfully!', 'success');
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to update employee', 'error');
    }
  };

  // Handle employee delete
  const handleDelete = async (employeeId: string) => {
    const employee = allEmployees.find((emp) => emp.id === employeeId);
    if (employee) {
      setDeleteDialog({
        open: true,
        employeeId,
        employeeName: `${employee.first_name} ${employee.last_name}`
      });
    }
  };

  // Confirm employee delete
  const confirmDelete = async () => {
    if (deleteDialog.employeeId) {
      try {
        await dispatch(deleteEmployee(deleteDialog.employeeId)).unwrap();
        showSnackbar('Employee deleted successfully!', 'success');
        setDeleteDialog({ open: false, employeeId: null, employeeName: '' });
      } catch (error: any) {
        showSnackbar(error.message || 'Failed to delete employee', 'error');
      }
    }
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, employeeId: null, employeeName: '' });
  };

  // Handle CSV import completion
  const handleCSVImportComplete = (newEmployees: Employee[]) => {
    dispatch(closeCSVImportModal());
    showSnackbar(`Successfully imported ${newEmployees.length} employees!`, 'success');
  };

  // Show snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Employee table configuration for AllyviaPaginatedTable
  // DISPLAY ALL FIELDS except created_at, updated_at, id, and company_id
  const employeeColumns = [
    // {
    //   field: 'company_name',
    //   headerName: 'Company Name',
    //   sortable: true,
    //   renderCell: (params: any) => <Typography variant="body2">{params?.value || '—'}</Typography>
    // },
    // {
    //   field: 'first_name',
    //   headerName: 'First Name',
    //   sortable: true,
    //   renderCell: (params: any) => <Typography variant="body2">{params?.value || '—'}</Typography>
    // },
    // {
    //   field: 'last_name',
    //   headerName: 'Last Name',
    //   sortable: true,
    //   renderCell: (params: any) => <Typography variant="body2">{params?.value || '—'}</Typography>
    // },
    {
      field: 'full_name',
      headerName: 'Full Name',
      sortable: true,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params?.value || '—'}
        </Typography>
      )
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 250,
      sortable: true,
      renderCell: (params: any) => <Typography variant="body2">{params?.value || '—'}</Typography>
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 175,
      sortable: false,
      renderCell: (params: any) => (
        <Typography variant="body2" fontFamily="monospace">
          {params?.value || '—'}
        </Typography>
      )
    },
    {
      field: 'title',
      headerName: 'Title',
      sortable: true,
      renderCell: (params: any) => <Typography variant="body2">{params?.value || '—'}</Typography>
    },
    // {
    //   field: 'address',
    //   headerName: 'Address',
    //   sortable: false,
    //   renderCell: (params: any) => <Typography variant="body2">{params?.value || 'Not provided'}</Typography>
    // },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      renderCell: (params: any) => (
        <Chip label={getStatusDisplayText(params?.value || 'unknown')} size="small" color={getStatusColor(params?.value || 'unknown')} />
      )
    },
    // {
    //   field: 'is_active',
    //   headerName: 'Active',
    //   sortable: true,
    //   renderCell: (params: any) => <Chip label={params?.value ? 'Yes' : 'No'} size="small" color={params?.value ? 'success' : 'error'} />
    // },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 190,
      sortable: false,
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleViewDetails(params.row)}
            title="View Details"
            sx={{
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.light', color: 'primary.contrastText' }
            }}
          >
            <IconView />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            title="Edit Employee"
            sx={{
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.light', color: 'primary.contrastText' }
            }}
          >
            <IconEdit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            title="Delete Employee"
            sx={{
              color: 'error.main',
              '&:hover': { backgroundColor: 'error.light', color: 'error.contrastText' }
            }}
          >
            <IconDelete />
          </IconButton>
        </Box>
      )
    }
  ];

  // Employee actions for AllyviaPaginatedTable
  const employeeActions = [
    {
      key: 'view',
      label: 'View',
      icon: <IconView />,
      onClick: (employee: Employee) => handleViewDetails(employee),
      color: 'primary' as const
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <IconEdit />,
      onClick: (employee: Employee) => handleEdit(employee),
      color: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <IconDelete />,
      onClick: (employee: Employee) => handleDelete(employee.id),
      color: 'error' as const
    }
  ];

  if (!currentRole?.company_id) {
    return (
      <MainCard>
        <Alert severity="error">
          <Typography variant="h6">Please select a company to manage employees</Typography>
        </Alert>
      </MainCard>
    );
  }

  return (
    <MainCard title="Employee Management">
      <Grid container spacing={gridSpacing}>
        {/* Employee Statistics */}
        <Grid size={12}>{loading ? <LoadingSkeleton height={120} /> : <EmployeeStats stats={employeeStats} />}</Grid>

        {/* Employee Table Section */}
        <Grid size={12}>
          <Box sx={{ mb: 2 }}>
            {/* TOP SECTION: Add Employee Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Employees</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<IconFileTypeCsv />}
                  onClick={() => dispatch(openCSVImportModal())}
                  sx={{
                    bgcolor: COLORS.primaryBlue,
                    color: 'white',
                    '&:hover': {
                      bgcolor: COLORS.primaryBlue,
                      opacity: 0.9
                    }
                  }}
                >
                  Import CSV
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconPlus />}
                  onClick={() => setIsFormOpen(true)}
                  sx={{
                    bgcolor: COLORS.primaryBlue,
                    color: 'white',
                    '&:hover': {
                      bgcolor: COLORS.primaryBlue,
                      opacity: 0.9
                    }
                  }}
                >
                  Add Employee
                </Button>
              </Box>
            </Box>

            {/* TABLE: AllyviaPaginatedTable with action buttons on top right */}
            <Box sx={{ position: 'relative' }}>
              {/* Show loading skeleton while fetching data */}
              {loading ? (
                <LoadingSkeleton height={xLargeWidgetHeight} />
              ) : (
                /* EMPLOYEE TABLE */
                <AllyviaPaginatedTable
                  rows={allEmployees}
                  columns={employeeColumns}
                  showPagination={true}
                  height={600}
                  showFilters={true}
                  filterFields={['status', 'title', 'is_active', 'company_name']}
                  title="Employee List"
                />
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Modals */}
      <EmployeeForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateEmployee}
        companyId={currentRole.company_id}
        companyName={currentRole.company_name}
      />

      <EmployeeEditModal
        open={isEditModalOpen}
        employee={selectedEmployee}
        onClose={() => dispatch(closeEditModal())}
        onUpdate={handleUpdateEmployee}
      />

      <EmployeeDetailModal
        open={isDetailModalOpen}
        employee={selectedEmployee}
        onClose={() => dispatch(closeDetailModal())}
        onEdit={(employee) => {
          dispatch(closeDetailModal());
          dispatch(openEditModal(employee));
        }}
      />

      <CSVImportModal
        open={isCSVImportModalOpen}
        companyId={currentRole.company_id}
        onClose={() => dispatch(closeCSVImportModal())}
        onImportComplete={handleCSVImportComplete}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" color="error">
            Confirm Delete
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the employee <strong>{deleteDialog.employeeName}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone. All employee data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete Employee
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainCard>
  );
}
