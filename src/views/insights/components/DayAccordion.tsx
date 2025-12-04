import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { IconChevronDown, IconCalendar } from '@tabler/icons-react';
import { DailyInsight } from 'types/analytics';
import HourlyBlockCard from './HourlyBlockCard';

interface DayAccordionProps {
  day: DailyInsight;
}

export default function DayAccordion({ day }: DayAccordionProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Accordion sx={{ border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<IconChevronDown />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <IconCalendar size={20} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {day.day_of_week}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(day.date)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 2 }}>
            {day.day_summary}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Daily Priorities */}
          {day.daily_priorities && day.daily_priorities.length > 0 && (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Daily Priorities
              </Typography>
              {day.daily_priorities.map((priority, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                  {index + 1}. {priority}
                </Typography>
              ))}
            </Box>
          )}

          {/* Hourly Blocks */}
          {day.hourly_blocks && day.hourly_blocks.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Hourly Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {day.hourly_blocks.map((block, index) => (
                  <HourlyBlockCard key={index} block={block} />
                ))}
              </Box>
            </Box>
          )}

          {/* Day-specific alerts (if any) */}
          {day.critical_alerts && day.critical_alerts.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'error.main' }}>
                Critical Alerts for This Day
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {day.critical_alerts.length} alert(s) - see Critical Alerts section above for details
              </Typography>
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
