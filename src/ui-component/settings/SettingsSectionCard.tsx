import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ==============================|| SETTINGS - SECTION CARD ||============================== //
// The frame's panel (design handoff 1.3): hairline border, 10px radius, a header
// with a 17px icon in text.secondary, a 16px/600 title and a one-clause
// description, then the body at 16px padding.

export interface SettingsSectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Right-aligned header content (a status chip, a small action). */
  action?: ReactNode;
  children: ReactNode;
}

export default function SettingsSectionCard({ title, description, icon, action, children }: SettingsSectionCardProps) {
  return (
    <Box
      component="section"
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          px: '14px',
          py: '11px',
          borderBottom: '1px solid',
          borderColor: 'grey.100'
        }}
      >
        {icon ? (
          <Box
            component="span"
            sx={{ display: 'flex', color: 'text.secondary', mt: '3px', flexShrink: 0, '& svg': { width: 17, height: 17 } }}
          >
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.dark', lineHeight: 1.3 }}>
            {title}
          </Typography>
          {description ? (
            <Typography sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.45 }}>{description}</Typography>
          ) : null}
        </Box>
        {action ? <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{action}</Box> : null}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
