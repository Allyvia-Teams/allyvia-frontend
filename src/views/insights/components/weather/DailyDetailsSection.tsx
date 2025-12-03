import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import { IconChevronRight, IconCalendar, IconFileText, IconTarget, IconClock } from '@tabler/icons-react';
import { DailyInsight } from './types';
import DayTimeline from '../DayTimeline';
import { useRef, useEffect } from 'react';
import { getWeatherIcon } from 'utils/weatherIcons';
import { formatDateOnly } from 'utils/dateUtils';

interface DailyDetailsSectionProps {
  dailyInsights: DailyInsight[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
  expandedHourBlock: string | null;
  setExpandedHourBlock: (block: string | null) => void;
  highlightedBlock: string | null;
  dailyDetailsRef: React.RefObject<HTMLDivElement | null>;
  scrollToBlock?: string | null;
}

export default function DailyDetailsSection({
  dailyInsights,
  selectedDay,
  onSelectDay,
  expandedHourBlock,
  setExpandedHourBlock,
  highlightedBlock,
  dailyDetailsRef,
  scrollToBlock
}: DailyDetailsSectionProps) {
  const selectedDayData = dailyInsights[selectedDay];
  const accordionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (scrollToBlock && accordionRefs.current[scrollToBlock]) {
      setTimeout(() => {
        const element = accordionRefs.current[scrollToBlock];
        if (element) {
          const elementTop = element.offsetTop;
          const offset = 80;
          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        }
      }, 350);
    }
  }, [scrollToBlock]);

  if (!selectedDayData) return null;

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

  return (
    <Box
      ref={dailyDetailsRef}
      sx={{
        mb: 3,
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
            <IconCalendar size={20} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
            Daily Forecast
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1, p: 2.5, bgcolor: 'background.default', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
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
                Day Summary{' '}
                <Typography component="span" variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                  ({formatDateOnly(selectedDayData.date, 'MMM dd, yyyy')})
                </Typography>
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {selectedDayData.day_summary}
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} />
          {selectedDayData.daily_priorities && selectedDayData.daily_priorities.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
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
                  Priorities for This Day{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                    ({formatDateOnly(selectedDayData.date, 'MMM dd')})
                  </Typography>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedDayData.daily_priorities.map((priority, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
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
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, flex: 1, minWidth: 0 }}>
                      {priority}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {selectedDayData.daily_priorities && selectedDayData.daily_priorities.length > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} />
          )}
          {selectedDayData.hourly_blocks && selectedDayData.hourly_blocks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
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
                  <IconClock size={20} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
                  Hourly Breakdown{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                    ({formatDateOnly(selectedDayData.date, 'MMM dd')})
                  </Typography>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedDayData.hourly_blocks.map((block, index) => {
                  const isHighlighted = highlightedBlock === block.time_block;
                  const isExpanded = expandedHourBlock === block.time_block;

                  const hasRecommendations =
                    block.recommendations?.inventory?.length > 0 ||
                    block.recommendations?.staffing?.length > 0 ||
                    block.recommendations?.sales_opportunities?.length > 0 ||
                    block.recommendations?.risk_mitigation?.length > 0;

                  return (
                    <Box
                      key={index}
                      ref={(el: HTMLDivElement | null) => {
                        if (el) {
                          accordionRefs.current[block.time_block] = el;
                        }
                      }}
                    >
                      <Accordion
                        expanded={hasRecommendations ? isExpanded : false}
                        onChange={hasRecommendations ? () => setExpandedHourBlock(isExpanded ? null : block.time_block) : () => {}}
                        sx={{
                          bgcolor: isHighlighted ? 'action.selected' : 'background.paper',
                          border: 1,
                          borderColor: isHighlighted ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          '&:before': { display: 'none' },
                          ...(hasRecommendations
                            ? {}
                            : {
                                cursor: 'default !important',
                                '& *': {
                                  cursor: 'default !important'
                                }
                              }),
                          transition: 'all 0.3s ease',
                          animation: isHighlighted ? 'pulse 0.5s ease-in-out 2' : 'none',
                          '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.02)' }
                          },
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
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              opacity: isExpanded ? 1 : hasRecommendations ? 0 : 0,
                              '&:hover': {
                                opacity: hasRecommendations ? 1 : 0
                              }
                            },
                            '&:hover .MuiAccordionSummary-expandIconWrapper': {
                              opacity: hasRecommendations && !isExpanded ? 1 : 1
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {block.time_block.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                              label={`${block.operational_impact} Impact`}
                              color={getImpactColor(block.operational_impact)}
                              size="small"
                              sx={{
                                textTransform: 'capitalize',
                                transform: 'none !important',
                                transition: 'none !important'
                              }}
                            />
                          </Box>
                        </AccordionSummary>

                        <AccordionDetails>
                          {!hasRecommendations ? (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                              No specific recommendations for this time block
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {block.recommendations?.inventory?.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                    Inventory
                                  </Typography>
                                  <Box sx={{ pl: 3 }}>
                                    {block.recommendations.inventory.map((item, idx) => (
                                      <Typography key={idx} variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                        • {item}
                                      </Typography>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {block.recommendations?.staffing?.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                    Staffing
                                  </Typography>
                                  <Box sx={{ pl: 3 }}>
                                    {block.recommendations.staffing.map((item, idx) => (
                                      <Typography key={idx} variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                        • {item}
                                      </Typography>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {block.recommendations?.sales_opportunities?.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                    Sales Opportunities
                                  </Typography>
                                  <Box sx={{ pl: 3 }}>
                                    {block.recommendations.sales_opportunities.map((item, idx) => (
                                      <Typography key={idx} variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                        • {item}
                                      </Typography>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {block.recommendations?.risk_mitigation?.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                    Risk Mitigation
                                  </Typography>
                                  <Box sx={{ pl: 3 }}>
                                    {block.recommendations.risk_mitigation.map((item, idx) => (
                                      <Typography key={idx} variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
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
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            maxHeight: '600px',
            overflow: 'hidden'
          }}
        >
          <DayTimeline days={dailyInsights} selectedDay={selectedDay} onSelectDay={onSelectDay} />
        </Box>
      </Box>
    </Box>
  );
}
