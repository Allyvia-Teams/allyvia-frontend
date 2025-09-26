import { Box, Button, ButtonProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const AllyviaFilterButton = ({
  height = 40,
  width,
  onClick,
  label = 'Button',
  disabled = false,
  variant = 'outlined',
  color = 'primary',
  ...rest
}: {
  height?: number;
  width?: number;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  variant?: ButtonProps['variant'];
  color?: ButtonProps['color'];
  [key: string]: any;
}) => {
  const theme = useTheme();

  const isContained = variant === 'contained';
  const adjustedHeight = height - 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: `${height}px`,
        width: width ? `${width}px` : 'auto'
      }}
    >
      <Button
        variant={variant}
        color={color}
        onClick={onClick}
        disabled={disabled}
        fullWidth
        sx={{
          height: `${adjustedHeight}px !important`,
          minHeight: `${adjustedHeight}px !important`,
          maxHeight: `${adjustedHeight}px !important`,
          padding: '0 16px !important',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxSizing: 'border-box !important',
          lineHeight: `${adjustedHeight - 2}px !important`,
          border: `1px solid ${theme.palette.primary.main} !important`,
          borderRadius: '8px !important',
          ...(isContained && {
            bgcolor: theme.palette.primary.main,
            color: 'white',
            '&:hover': {
              bgcolor: theme.palette.primary.dark
            }
          }),
          ...(variant === 'outlined' &&
            isContained && {
              bgcolor: theme.palette.primary.main,
              color: 'white',
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
                borderColor: theme.palette.primary.dark
              },
              borderColor: theme.palette.primary.main
            })
        }}
        {...rest}
      >
        {label}
      </Button>
    </Box>
  );
};

export default AllyviaFilterButton;
