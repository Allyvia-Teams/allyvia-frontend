import { Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const AllyviaFilterSelect = ({
  height = 40,
  width = 200,
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  borderWidth = 0.5,
  ...rest
}: {
  height?: number;
  width?: number;
  value: any;
  onChange: (event: SelectChangeEvent) => void;
  options?: { value: any; label: string }[];
  placeholder?: string;
  borderWidth?: number;
  [key: string]: any;
}) => {
  const theme = useTheme();

  return (
    <Select
      value={value}
      onChange={onChange}
      displayEmpty
      renderValue={(selected) => {
        if (!selected || selected === '') {
          return placeholder;
        }
        const option = options.find((opt) => opt.value === selected);
        return option ? option.label : selected;
      }}
      sx={{
        minWidth: width,
        height: `${height - 1}px !important`,
        borderRadius: '8px',
        '& .MuiOutlinedInput-root': {
          height: `${height - 1}px !important`,
          minHeight: `${height - 1}px !important`,
          maxHeight: `${height - 1}px !important`,
          borderRadius: '8px'
        },
        '& .MuiSelect-select': {
          padding: '8px 12px !important',
          display: 'flex',
          alignItems: 'center',
          height: 'auto !important',
          minHeight: 'auto !important',
          lineHeight: `${height - 17}px !important`
        },
        '& .MuiOutlinedInput-input': {
          padding: '8px 12px !important'
        },
        '& .MuiOutlinedInput-notchedOutline': {
          border: borderWidth > 0 ? `${borderWidth}px solid ${theme.palette.divider} !important` : 'none !important',
          borderRadius: '8px'
        }
      }}
      {...rest}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};

export default AllyviaFilterSelect;
