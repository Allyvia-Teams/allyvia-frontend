import { Box } from '@mui/material';
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
          borderRadius: '8px !important'
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
