import React from 'react';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Download } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { downloadCSV } from 'utils/csvDownload';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const TopEmployees: React.FC = () => {
  const { topEmployees, loading } = useSelector((state: RootState) => state.analytics);

  const handleExport = () => {
    const csvData = topEmployees.map((employee) => ({
      'Employee Name': employee.employee_name || 'Unknown',
      'Total Hours': (employee as any).total_hours ?? employee.hours ?? 0,
      'Avg Hours/Day': (employee as any).avg_hours_per_day ?? 0,
      'Days Worked': (employee as any).days_worked ?? 0
    }));

    downloadCSV('top-employees-analytics.csv', csvData);
  };

  if (loading) {
    return (
      <MainCard title="Top Employees">
        <Skeleton variant="rectangular" height={300} />
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Top Employees"
      secondary={
        <Button
          startIcon={<Download />}
          onClick={handleExport}
          disabled={loading || topEmployees.length === 0}
          size="small"
          variant="outlined"
        >
          Export
        </Button>
      }
    >
      {topEmployees.length === 0 ? (
        <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
          No employee data available for the selected period
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee Name</TableCell>
                <TableCell align="right">Total Hours</TableCell>
                <TableCell align="right">Avg Hours/Day</TableCell>
                <TableCell align="right">Days Worked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topEmployees.slice(0, 10).map((employee, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {employee.employee_name || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {(((employee as any).total_hours ?? employee.hours ?? 0) as number).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{(((employee as any).avg_hours_per_day ?? 0) as number).toFixed(1)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{(((employee as any).days_worked ?? 0) as number).toLocaleString()}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </MainCard>
  );
};

export default TopEmployees;
