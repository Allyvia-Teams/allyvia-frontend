import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { HourlyBlock } from 'types/analytics';
import { getWeatherIcon } from 'utils/weatherIcons';
import { useState } from 'react';

interface HourlyBlockCardProps {
  block: HourlyBlock;
}

export default function HourlyBlockCard({ block }: HourlyBlockCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'success';
    }
  };

  const formatTimeBlock = (timeBlock: string) => {
    return timeBlock.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const hasRecommendations =
    block.recommendations.inventory.length > 0 ||
    block.recommendations.staffing.length > 0 ||
    block.recommendations.sales_opportunities.length > 0 ||
    block.recommendations.risk_mitigation.length > 0;

  return (
    <Accordion
      expanded={hasRecommendations ? expanded : false}
      onChange={hasRecommendations ? (_, isExp) => setExpanded(isExp) : () => {}}
      sx={{
        border: 1,
        borderColor: 'divider',
        '&:before': { display: 'none' },
        ...(hasRecommendations
          ? {}
          : {
              cursor: 'default !important',
              '& *': {
                cursor: 'default !important'
              }
            }),
        '& .MuiAccordionSummary-root': {
          '&:hover': {
            '& .MuiChip-root': {
              transform: 'none'
            }
          }
        }
      }}
    >
      <AccordionSummary
        expandIcon={hasRecommendations ? <IconChevronRight /> : <Box sx={{ width: 48 }} />}
        sx={{
          ...(hasRecommendations
            ? { cursor: 'pointer' }
            : {
                cursor: 'default !important',
                '&:hover': { bgcolor: 'transparent' },
                '& *': {
                  cursor: 'default !important'
                }
              }),
          '& .MuiAccordionSummary-expandIconWrapper': {
            minWidth: 48,
            width: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: expanded ? 1 : hasRecommendations ? 0 : 0,
            '&:hover': {
              opacity: hasRecommendations ? 1 : 0
            }
          },
          '&:hover .MuiAccordionSummary-expandIconWrapper': {
            opacity: hasRecommendations && !expanded ? 1 : 1
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: hasRecommendations ? 2 : 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {formatTimeBlock(block.time_block)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {block.hours}
            </Typography>
          </Box>
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>
                {getWeatherIcon(block.weather_condition)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                {block.weather_condition}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {block.temp_max}°F / {block.temp_min}°F
            </Typography>
          </Box>
          <Chip
            label={`${block.operational_impact.toUpperCase()} IMPACT`}
            color={getImpactColor(block.operational_impact)}
            size="small"
            sx={{
              transform: 'none !important',
              transition: 'none !important'
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {!hasRecommendations ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No specific recommendations for this time block.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {block.recommendations.inventory.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Inventory
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {block.recommendations.inventory.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {block.recommendations.staffing.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Staffing
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {block.recommendations.staffing.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {block.recommendations.sales_opportunities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Sales Opportunities
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {block.recommendations.sales_opportunities.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {block.recommendations.risk_mitigation.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Risk Mitigation
                </Typography>
                <Box sx={{ pl: 3 }}>
                  {block.recommendations.risk_mitigation.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
