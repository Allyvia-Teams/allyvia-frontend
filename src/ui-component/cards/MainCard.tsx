import { CSSProperties, ReactNode, Ref } from 'react';

// material-ui
import Card, { CardProps } from '@mui/material/Card';
import CardContent, { CardContentProps } from '@mui/material/CardContent';
import CardHeader, { CardHeaderProps } from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// icons
import { IconChevronUp, IconChevronDown, IconRefresh } from '@tabler/icons-react';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import useLocalStorage from 'hooks/useLocalStorage';

// constant
const headerStyle = {
  '& .MuiCardHeader-action': { mr: 0 }
};

// ==============================|| CUSTOM MAIN CARD ||============================== //

export interface MainCardProps {
  border?: boolean;
  boxShadow?: boolean;
  children: ReactNode | string;
  style?: CSSProperties;
  content?: boolean;
  className?: string;
  contentClass?: string;
  contentSX?: CardContentProps['sx'];
  headerSX?: CardHeaderProps['sx'];
  darkTitle?: boolean;
  sx?: CardProps['sx'];
  secondary?: CardHeaderProps['action'];
  shadow?: string;
  elevation?: number;
  title?: ReactNode | string;
  ref?: Ref<HTMLDivElement>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  persistenceKey?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function MainCard({
  border = false,
  boxShadow,
  children,
  content = true,
  contentClass = '',
  contentSX = {},
  headerSX = {},
  darkTitle,
  secondary,
  shadow,
  sx = {},
  title,
  ref,
  collapsible = false,
  defaultCollapsed = false,
  persistenceKey,
  onRefresh,
  isRefreshing = false,
  ...others
}: MainCardProps) {
  const { mode } = useConfig();
  const defaultShadow = mode === ThemeMode.DARK ? '0 2px 14px 0 rgb(33 150 243 / 10%)' : '0 2px 14px 0 rgb(32 40 45 / 8%)';

  // Manage collapsed state with localStorage persistence if key is provided
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(persistenceKey || 'maincard-collapsed', defaultCollapsed);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Build action buttons for collapsible cards
  const buildActionButtons = () => {
    const buttons = [];

    // Add refresh button if onRefresh is provided
    if (onRefresh) {
      buttons.push(
        <IconButton
          key="refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh"
          size="small"
          sx={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        >
          <IconRefresh />
        </IconButton>
      );
    }

    // Add collapse/expand button if collapsible
    if (collapsible) {
      buttons.push(
        <IconButton key="collapse" onClick={handleToggleCollapse} title={isCollapsed ? 'Expand' : 'Collapse'} size="small">
          {isCollapsed ? <IconChevronDown /> : <IconChevronUp />}
        </IconButton>
      );
    }

    // Combine with existing secondary actions
    if (secondary || buttons.length > 0) {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {secondary}
          {buttons}
        </Box>
      );
    }

    return null;
  };

  const actionButtons = buildActionButtons();

  return (
    <Card
      ref={ref}
      {...others}
      sx={(theme) => ({
        border: border ? '1px solid' : 'none',
        borderColor: 'divider',
        ':hover': {
          boxShadow: boxShadow ? shadow || defaultShadow : 'inherit'
        },
        ...(typeof sx === 'function' ? sx(theme) : sx || {})
      })}
    >
      {/* card header and action */}
      {!darkTitle && title && <CardHeader sx={{ ...headerStyle, ...headerSX }} title={title} action={actionButtons} />}
      {darkTitle && title && (
        <CardHeader sx={{ ...headerStyle, ...headerSX }} title={<Typography variant="h3">{title}</Typography>} action={actionButtons} />
      )}

      {/* content & header divider */}
      {title && <Divider />}

      {/* card content with optional collapse */}
      {collapsible ? (
        <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
          {content && (
            <CardContent sx={contentSX} className={contentClass}>
              {children}
            </CardContent>
          )}
          {!content && children}
        </Collapse>
      ) : (
        <>
          {content && (
            <CardContent sx={contentSX} className={contentClass}>
              {children}
            </CardContent>
          )}
          {!content && children}
        </>
      )}
    </Card>
  );
}
