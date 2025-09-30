import { styled } from '@mui/material/styles';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

interface CustomMenuTooltipProps {
  width?: number;
  height?: number;
}

const CustomMenuTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} placement="right" />
))<CustomMenuTooltipProps>(({ theme, width = 140, height = 48 }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '8px 16px 8px 20px',
    margin: 0,
    marginLeft: '8px',
    borderRadius: 0,
    width: width,
    minHeight: height,
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    whiteSpace: 'normal',
    lineHeight: 1.3,
    position: 'relative',
    clipPath: `polygon(
      12% 0%, 
      100% 0%, 
      100% 100%, 
      12% 100%, 
      0% 50%
    )`,
    transition: 'all 0.2s ease-in-out',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '-8px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: '12px 8px 12px 0',
      borderColor: `transparent ${theme.palette.primary.main} transparent transparent`,
      display: 'none' // Using clipPath instead for cleaner arrow
    }
  },
  [`& .${tooltipClasses.arrow}`]: {
    display: 'none' // Hide default arrow
  }
}));

export default CustomMenuTooltip;
