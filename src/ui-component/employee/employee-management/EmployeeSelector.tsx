import { Box, Autocomplete, TextField, CircularProgress, Typography } from '@mui/material';
import { EmployeeListItem } from 'types/employee';

interface EmployeeSelectorProps {
  employees: EmployeeListItem[];
  selectedEmployee: EmployeeListItem | null;
  onEmployeeChange: (employee: EmployeeListItem | null) => void;
  loading: boolean;
  label?: string;
}

export default function EmployeeSelector({
  employees,
  selectedEmployee,
  onEmployeeChange,
  loading,
  label = 'Select Employee'
}: EmployeeSelectorProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Autocomplete
        options={employees}
        getOptionLabel={(option) => option.full_name}
        value={selectedEmployee || (employees.length > 0 ? employees[0] : undefined)}
        onChange={(_, newValue) => onEmployeeChange(newValue)}
        loading={loading}
        size="small"
        fullWidth
        disableClearable
        filterOptions={(options, { inputValue }) => {
          const filterValue = inputValue.toLowerCase();
          return options.filter(
            (option) => option.full_name.toLowerCase().includes(filterValue) || option.email.toLowerCase().includes(filterValue)
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
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
            <Typography variant="body1" fontWeight="medium">
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
