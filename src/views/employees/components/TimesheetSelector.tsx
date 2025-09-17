import { Box, Autocomplete, TextField, CircularProgress, Typography } from '@mui/material';
import { EmployeeListItem } from 'types/employee';

interface TimesheetSelectorProps {
  employees: EmployeeListItem[];
  selectedEmployee: EmployeeListItem | null;
  onEmployeeChange: (employee: EmployeeListItem | null) => void;
  loading: boolean;
}

interface SelectorOption {
  id: string;
  full_name: string;
  email?: string;
  isAll?: boolean;
}

export default function TimesheetSelector({ employees, selectedEmployee, onEmployeeChange, loading }: TimesheetSelectorProps) {
  const options: SelectorOption[] = employees;

  // Convert selectedEmployee to SelectorOption format
  const selectedOption = selectedEmployee ? { ...selectedEmployee, isAll: false } : null;

  const handleChange = (_: any, newValue: SelectorOption | null) => {
    onEmployeeChange(newValue as EmployeeListItem);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Autocomplete
        options={options}
        getOptionLabel={(option) => option.full_name}
        value={selectedOption}
        onChange={handleChange}
        loading={loading}
        size="small"
        fullWidth
        filterOptions={(options, { inputValue }) => {
          const filterValue = inputValue.toLowerCase();
          return options.filter((option) => {
            return (
              option.full_name.toLowerCase().includes(filterValue) || (option.email && option.email.toLowerCase().includes(filterValue))
            );
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select Employee for Timesheet"
            placeholder="Search by name or email..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Typography variant="body1" fontWeight={500}>
              {option.full_name}
            </Typography>
          </Box>
        )}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText="No employees found"
        loadingText="Loading employees..."
      />
    </Box>
  );
}
