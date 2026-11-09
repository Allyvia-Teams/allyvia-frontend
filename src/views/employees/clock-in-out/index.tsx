// Clock In/Out page shell — orchestration lives in EmployeeTimeTracking
import { useSelector } from 'store';
import { selectEffectiveRoleType } from 'store/selectors/effectiveRole';
import MainCard from 'ui-component/cards/MainCard';
import { EmployeeTimeTracking } from 'ui-component/employee';
import { Box, Typography, CircularProgress } from '@mui/material';
import { isAdminOrAbove } from 'utils/role';

export default function ClockInOutPage() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const role = useSelector(selectEffectiveRoleType);
  const employees = useSelector((state) => state.employee.allEmployees);
  const employeesLoading = useSelector((state) => state.employee.loading);

  // Show loading state while refreshing roles
  if (!companyId) {
    return (
      <MainCard>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Loading company information...
          </Typography>
        </Box>
      </MainCard>
    );
  }

  // Hide clock page if no employees (admin only)
  if (isAdminOrAbove(role) && !employeesLoading && employees.length === 0) {
    return (
      <MainCard>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h4" gutterBottom color="textSecondary">
            No Employees Available
          </Typography>
          <Typography variant="body1" color="textSecondary">
            You need to add employees before you can use the clock in/out system.
          </Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <div className="p-6">
      <EmployeeTimeTracking />
    </div>
  );
}
