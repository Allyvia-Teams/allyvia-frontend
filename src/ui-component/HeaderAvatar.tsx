// material-ui imports
import { useTheme, Avatar, AvatarProps } from '@mui/material';
import { ReactNode } from 'react';
// project imports
import { ThemeMode } from 'config';

interface HeaderAvatarProps extends AvatarProps {
  children: ReactNode;
}

export function HeaderAvatar({ children, ref, ...others }: HeaderAvatarProps) {
  const theme = useTheme();

  return (
    <Avatar
      ref={ref}
      variant="rounded"
      sx={{
        ...theme.typography.commonAvatar,
        ...theme.typography.mediumAvatar,
        border: '1px solid',
        borderColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'divider',
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.paper',
        color: theme.palette.mode === ThemeMode.DARK ? 'secondary.main' : 'grey.700',
        '&:hover': {
          borderColor: theme.palette.mode === ThemeMode.DARK ? 'secondary.main' : 'grey.900',
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'secondary.main' : 'grey.900',
          color: theme.palette.mode === ThemeMode.DARK ? 'secondary.light' : 'background.paper'
        }
      }}
      {...others}
    >
      {children}
    </Avatar>
  );
}
