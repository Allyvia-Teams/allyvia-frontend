import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface SettingsSectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function SettingsSectionCard({ title, description, icon, children }: SettingsSectionCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper'
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
          {icon && <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', mt: 0.25 }}>{icon}</Box>}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}
