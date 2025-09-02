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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  CircularProgress,
  TablePagination
} from '@mui/material';
import { IconPlus, IconFileTypeCsv, IconEye, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { gridSpacing } from 'store/constant';
import AnimateButton from 'ui-component/extended/AnimateButton';
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
import CompanySelector from 'ui-component/employee/CompanySelector';
import { calculateEmployeeStats, getStatusColor, getStatusDisplayText } from 'utils/employeeUtils';
import { Employee, CreateEmployeeData, UpdateEmployeeData } from 'types/employee';
import { useIsAdmin } from 'hooks/usePermission';
import { getRoleDisplayName } from 'utils/role';

export default function EmployeeManagementPage() {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const isAdmin = useIsAdmin();

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  // Load employees on component mount and when company changes
  // Employees are filtered by the selected company via X-Company-Id header
  useEffect(() => {
    if (currentRole?.company_id) {
      dispatch(fetchEmployees());
    }
  }, [currentRole?.company_id, currentRole?.id, dispatch]);

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

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate paginated data
  const paginatedEmployees = allEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h3">Employee Management{currentRole?.company_name ? ` - ${currentRole.company_name}` : ''}</Typography>
          {currentRole && <Chip label={getRoleDisplayName(currentRole.role_type)} size="small" color="primary" variant="filled" />}
        </Box>
      }
      secondary={
        <Stack direction="row" spacing={1}>
          <CompanySelector variant="outlined" size="small" showLabel={false} showIcon={true} />
          {isAdmin && (
            <AnimateButton>
              <Button
                variant="contained"
                startIcon={<IconFileTypeCsv size={16} />}
                onClick={() => dispatch(openCSVImportModal())}
                size="small"
                disabled={loading}
                sx={{
                  py: 0.5,
                  px: 1.5,
                  fontSize: '0.8125rem',
                  color: 'white'
                }}
              >
                Import CSV
              </Button>
            </AnimateButton>
          )}
          {isAdmin && (
            <AnimateButton>
              <Button
                variant="contained"
                startIcon={<IconPlus size={16} />}
                onClick={() => setIsFormOpen(true)}
                size="small"
                disabled={loading}
                sx={{
                  py: 0.5,
                  px: 1.5,
                  fontSize: '0.8125rem',
                  color: 'white'
                }}
              >
                Add Employee
              </Button>
            </AnimateButton>
          )}
          <IconButton onClick={() => dispatch(fetchEmployees())} size="small" disabled={loading}>
            <IconRefresh />
          </IconButton>
        </Stack>
      }
    >
      <Grid container spacing={gridSpacing}>
        {/* Employee Statistics */}
        <Grid size={12}>{loading ? <LoadingSkeleton height={120} /> : <EmployeeStats stats={employeeStats} />}</Grid>
        {/* Employee Table Section */}
        <Grid size={12}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : allEmployees.length === 0 ? (
            <Box textAlign="center" p={4}>
              <Typography variant="body1" color="textSecondary">
                No employees found. {isAdmin ? 'Add your first employee to get started.' : 'No employees are available for viewing.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedEmployees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {`${employee.first_name} ${employee.last_name}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{employee.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {employee.phone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{employee.title || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusDisplayText(employee.status || 'unknown')}
                          size="small"
                          color={getStatusColor(employee.status || 'unknown')}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton size="small" color="primary" onClick={() => handleViewDetails(employee)}>
                            <IconEye size={18} />
                          </IconButton>
                          {isAdmin && (
                            <>
                              <IconButton size="small" color="primary" onClick={() => handleEdit(employee)}>
                                <IconEdit size={18} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDelete(employee.id)}>
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
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={allEmployees.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
              />
            </TableContainer>
          )}
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
