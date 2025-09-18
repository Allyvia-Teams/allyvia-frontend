import { Box, Stack, Typography } from '@mui/material';
import { EmployeeSelector } from '../employee-management';
import ClockActions from './ClockActions';
import { EmployeeListItem } from 'types/employee';

interface ClockInControlPanelProps {
  // Employee Selection Props
  employees: EmployeeListItem[];
  selectedEmployee: EmployeeListItem | null;
  onEmployeeChange: (employee: EmployeeListItem | null) => void;
  employeesLoading: boolean;

  // Clock Actions Props
  status: 'in' | 'out';
  loading: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  onClockIn: () => void;
  onClockOut: () => void;
  error?: string | null;
  isAdmin: boolean;
}

export default function ClockInControlPanel({
  employees,
  selectedEmployee,
  onEmployeeChange,
  employeesLoading,
  status,
  loading,
  note,
  onNoteChange,
  onClockIn,
  onClockOut,
  error,
  isAdmin
}: ClockInControlPanelProps) {
  return (
    <>
      <Stack direction="row" alignItems="flex-start" gap={3}>
        {/* Employee Selection - Only for Admin */}
        {isAdmin && (
          <Box sx={{ minWidth: 300 }}>
            <EmployeeSelector
              employees={employees}
              selectedEmployee={selectedEmployee}
              onEmployeeChange={onEmployeeChange}
              loading={employeesLoading}
              label="Select Employee"
            />
          </Box>
        )}

        {/* Clock Actions */}
        <Box sx={{ flex: 1 }}>
          <ClockActions
            status={status}
            loading={loading}
            note={note}
            onNoteChange={onNoteChange}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            error={error}
            isAdmin={isAdmin}
            hasSelectedEmployee={!!selectedEmployee}
          />
        </Box>
      </Stack>
    </>
  );
}
