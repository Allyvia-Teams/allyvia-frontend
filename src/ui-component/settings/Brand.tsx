import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBrush } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import logo from 'assets/images/allyvia_icon.png';

// ==============================|| SETTINGS - BRAND ||============================== //
// Shows the workspace logo and the three accent colors sampled from it.
// These are the colors the interface is painted with: Primary (links, charts,
// selected states), Secondary (calendar events, chart series) and Ink
// (headings, primary buttons, active navigation).

export default function Brand() {
  const theme = useTheme();

  const accents = [
    { label: 'Primary', color: theme.palette.primary.main },
    { label: 'Secondary', color: theme.palette.secondary.main },
    { label: 'Ink', color: theme.palette.grey[900] }
  ];

  return (
    <SettingsSectionCard
      title="Brand"
      description="Your logo and colors personalize this workspace"
      icon={<IconBrush size={24} stroke={1.5} />}
    >
      <Stack spacing={2.5}>
        {/* Logo */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            component="img"
            src={logo}
            alt="Company logo"
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              objectFit: 'contain',
              p: 0.75,
              bgcolor: 'background.paper'
            }}
          />
          <Box>
            <Typography variant="subtitle1">Company logo</Typography>
            <Typography variant="body2" color="text.secondary">
              The accent colors below are sampled from it
            </Typography>
          </Box>
        </Stack>

        {/* Accent colors */}
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            Accent colors
          </Typography>
          <Stack direction="row" spacing={2}>
            {accents.map((accent) => (
              <Stack key={accent.label} spacing={0.75} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2.25,
                    bgcolor: accent.color,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {accent.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </SettingsSectionCard>
  );
}
