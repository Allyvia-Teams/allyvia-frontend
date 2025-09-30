import { Box, TextField, TextFieldProps, InputAdornment } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

type AllyviaFilterSearchProps = Omit<TextFieldProps, 'size' | 'variant'> & {
  height?: number;
  width?: number;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  showIcon?: boolean;
  borderWidth?: number;
};

const AllyviaFilterSearch = ({
  height = 40,
  width,
  value,
  onChange,
  placeholder = 'Search...',
  showIcon = true,
  borderWidth = 1,
  sx: sxProp,
  ...rest
}: AllyviaFilterSearchProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: `${height}px`,
        width: width ? `${width}px` : 'auto',
        minWidth: width ? `${width}px` : 200,
        ...sxProp
      }}
    >
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        variant="outlined"
        fullWidth
        sx={{
          backgroundColor: `${theme.palette.background.default} !important`,
          borderRadius: '8px',
          '& .MuiOutlinedInput-root': {
            height: `${height - 1}px !important`,
            minHeight: `${height - 1}px !important`,
            maxHeight: `${height - 1}px !important`,
            borderRadius: '8px',
            backgroundColor: `${theme.palette.background.default} !important`,
            background: `${theme.palette.background.default} !important`
          },
          '& .MuiOutlinedInput-input': {
            padding: '8px 12px !important',
            display: 'flex',
            alignItems: 'center',
            height: 'auto !important',
            minHeight: 'auto !important',
            lineHeight: `${height - 17}px !important`,
            backgroundColor: `${theme.palette.background.default} !important`,
            background: `${theme.palette.background.default} !important`
          },
          '& .MuiInputAdornment-root': {
            marginRight: '-4px',
            '& svg': {
              color: theme.palette.text.secondary
            }
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: borderWidth > 0 ? `${borderWidth}px solid ${theme.palette.divider} !important` : 'none !important',
            borderRadius: '8px'
          },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: `${theme.palette.primary.main} !important`
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: `${theme.palette.primary.main} !important`,
            borderWidth: `${borderWidth}px !important`
          }
        }}
        InputProps={{
          startAdornment: showIcon ? (
            <InputAdornment position="start">
              <IconSearch size={18} />
            </InputAdornment>
          ) : undefined,
          ...rest.InputProps
        }}
        {...rest}
      />
    </Box>
  );
};

export default AllyviaFilterSearch;
