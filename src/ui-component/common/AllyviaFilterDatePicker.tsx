import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AllyviaDateRangePicker, RangeValue } from 'ui-component/third-party/DateRangePicker';

const AllyviaFilterDatePicker = ({
  height = 40,
  width,
  value,
  onChange,
  ...rest
}: {
  height?: number;
  width?: number;
  value: RangeValue | null;
  onChange: (value: RangeValue | null) => void;
  [key: string]: any;
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: `${height}px`,
        '& .date-range-picker': {
          display: 'flex',
          alignItems: 'center',
          height: '100%'
        },
        '& .date-range-picker-group': {
          height: `${height - 1}px !important`,
          minHeight: `${height - 1}px !important`,
          maxHeight: `${height - 1}px !important`,
          padding: '8px 12px !important',
          boxSizing: 'border-box !important',
          display: 'inline-flex',
          alignItems: 'center',
          margin: 0,
          borderRadius: '8px !important',
          borderColor: `${theme.palette.divider} !important`,
          fontFamily: `${theme.typography.fontFamily} !important`,
          fontSize: '0.875rem !important'
        },
        '& .date-range-picker-input': {
          fontFamily: `${theme.typography.fontFamily} !important`,
          fontSize: '0.875rem !important',
          fontWeight: '500 !important',
          color: `${theme.palette.text.primary} !important`
        },
        '& .date-range-picker-separator': {
          fontFamily: `${theme.typography.fontFamily} !important`,
          fontSize: '0.875rem !important',
          color: `${theme.palette.text.secondary} !important`
        }
      }}
    >
      <AllyviaDateRangePicker
        value={value}
        onChange={onChange}
        style={{
          height: `${height}px`,
          minHeight: `${height}px`,
          maxHeight: `${height}px`,
          width: width ? `${width}px` : 'auto'
        }}
        {...rest}
      />
    </Box>
  );
};

export default AllyviaFilterDatePicker;
