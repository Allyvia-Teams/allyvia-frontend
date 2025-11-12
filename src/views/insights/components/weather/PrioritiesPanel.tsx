import { Box, Typography } from '@mui/material';
import { IconTarget } from '@tabler/icons-react';
import { WeekPriority } from 'types/analytics';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface PrioritiesPanelProps {
  priorities: WeekPriority[];
}

export default function PrioritiesPanel({ priorities }: PrioritiesPanelProps) {
  const prioritiesList = priorities || [];
  const hasPriorities = prioritiesList.length > 0;

  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            <IconTarget size={20} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
            Key Priorities
          </Typography>
        </Box>
      </Box>
      <AllyviaEmpty
        isEmpty={!hasPriorities}
        isLoading={false}
        type="list"
        title="No priorities identified"
        description="No priorities have been identified for this period"
        showIcon={true}
        showTitle={true}
        showDescription={true}
        height="auto"
        sx={{ flex: 1, p: 0 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {prioritiesList.map((priority, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-start'
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  width: 32,
                  flexShrink: 0,
                  fontSize: '1.25rem',
                  lineHeight: 1.2,
                  textAlign: 'right'
                }}
              >
                {index + 1}.
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.5,
                    lineHeight: 1.4
                  }}
                >
                  {priority.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.6
                  }}
                >
                  {priority.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </AllyviaEmpty>
    </Box>
  );
}
