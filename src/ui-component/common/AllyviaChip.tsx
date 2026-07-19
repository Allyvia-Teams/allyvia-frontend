import { Chip, ChipProps, Tooltip, TooltipProps } from '@mui/material';

interface AllyviaChipProps extends ChipProps {
  tooltipTitle?: string;
  tooltipPlacement?: TooltipProps['placement'];
  tooltipArrow?: boolean;
}

const AllyviaChip = ({ tooltipTitle, tooltipPlacement = 'top', tooltipArrow = true, sx, ...chipProps }: AllyviaChipProps) => {
  const chipElement = (
    <Chip
      {...chipProps}
      sx={{
        // Compact status pill per the design system: soft fill, small
        // semi-bold uppercase label, gently rounded corners.
        height: 24,
        borderRadius: '6px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        '& .MuiChip-label': {
          paddingLeft: '9px',
          paddingRight: '9px'
        },
        '& .MuiChip-icon': {
          marginLeft: '6px',
          marginRight: '-4px'
        },
        ...(chipProps.variant === 'outlined' && {
          borderWidth: '1px'
        }),
        ...sx
      }}
    />
  );

  if (tooltipTitle) {
    return (
      <Tooltip title={tooltipTitle} placement={tooltipPlacement} arrow={tooltipArrow}>
        {chipElement}
      </Tooltip>
    );
  }

  return chipElement;
};

export default AllyviaChip;
