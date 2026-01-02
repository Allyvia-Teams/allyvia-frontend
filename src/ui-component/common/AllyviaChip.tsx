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
        height: 32,
        borderRadius: '16px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        '& .MuiChip-label': {
          paddingLeft: '12px',
          paddingRight: '12px'
        },
        '& .MuiChip-icon': {
          marginLeft: '8px',
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
