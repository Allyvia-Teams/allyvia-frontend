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
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'primary.light',
        color: theme.palette.mode === ThemeMode.DARK ? 'secondary.main' : 'primary.dark',
        '&:hover': {
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'secondary.main' : 'primary.dark',
          color: theme.palette.mode === ThemeMode.DARK ? 'secondary.light' : 'primary.light'
        }
      }}
      {...others}
    >
      {children}
    </Avatar>
  );
}
