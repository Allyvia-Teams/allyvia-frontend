import { Box, Typography } from '@mui/material';
import { IconFileText } from '@tabler/icons-react';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface SummarySectionProps {
  overview: string;
  loading?: boolean;
}

export default function SummarySection({ overview, loading }: SummarySectionProps) {
  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <AllyviaEmpty isLoading={true} isEmpty={false} type="content" skeletonType="text" height={120} width="100%" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mb: 3,
        p: 3,
        bgcolor: '#f8f9fa',
        borderRadius: 2,
        border: 'none',
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: 'white',
            color: 'primary.main',
            border: 1,
            borderColor: 'primary.main'
          }}
        >
          <IconFileText size={20} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
          Summary
        </Typography>
      </Box>
      <Typography
        variant="body1"
        sx={{
          lineHeight: 1.8,
          color: 'text.primary',
          fontSize: '0.95rem',
          letterSpacing: '0.01em'
        }}
      >
        {overview}
      </Typography>
    </Box>
  );
}
