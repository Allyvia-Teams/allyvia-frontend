import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';
import type { AnalyticsTab } from '../registry/types';
import { ANALYTICS_TAB_LABELS, ANALYTICS_TAB_ORDER } from './tabLabels';
import { useAnalyticsLayout } from './AnalyticsLayoutContext';

const AnalyticsWidgetPicker: React.FC = () => {
  const { pickerOpen, closePicker, activeTab, isWidgetInLayout, addWidget } = useAnalyticsLayout();

  const widgetsByTab = useMemo(() => {
    const grouped = ANALYTICS_TAB_ORDER.reduce(
      (acc, tab) => {
        acc[tab] = WIDGET_DEFINITIONS.filter((definition) => definition.tab === tab);
        return acc;
      },
      {} as Record<AnalyticsTab, typeof WIDGET_DEFINITIONS>
    );

    return grouped;
  }, []);

  return (
    <Dialog
      open={pickerOpen}
      onClose={closePicker}
      maxWidth="md"
      fullWidth
      aria-labelledby="analytics-widget-picker-title"
      aria-label="Customize analytics widgets"
      role="dialog"
    >
      <FocusTrap open={pickerOpen}>
        <Box>
          <DialogTitle id="analytics-widget-picker-title" sx={{ pr: 6 }}>
            Customize widgets
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {ANALYTICS_TAB_LABELS[activeTab]} tab
            </Typography>
            <IconButton onClick={closePicker} aria-label="Close widget picker" sx={{ position: 'absolute', right: 12, top: 12 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ px: 3, py: 2 }}>
            <Stack spacing={3}>
              {ANALYTICS_TAB_ORDER.map((tab) => {
                const widgets = widgetsByTab[tab];
                if (widgets.length === 0) {
                  return null;
                }

                return (
                  <Box key={tab}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                      {ANALYTICS_TAB_LABELS[tab]}
                    </Typography>
                    <Stack spacing={1.5} divider={<Divider flexItem />}>
                      {widgets.map((widget) => {
                        const isAdded = isWidgetInLayout(widget.id);

                        return (
                          <Box
                            key={widget.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 2
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                <Typography variant="subtitle2">{widget.displayName}</Typography>
                                <Chip
                                  size="small"
                                  label={isAdded ? 'Added' : 'Not added'}
                                  color={isAdded ? 'success' : 'default'}
                                  variant={isAdded ? 'filled' : 'outlined'}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {widget.description}
                              </Typography>
                            </Box>

                            <Box sx={{ flexShrink: 0, pt: 0.25 }}>
                              {isAdded ? (
                                <IconButton aria-label={`${widget.displayName} already added`} disabled size="small">
                                  <CheckCircleOutlineIcon color="success" />
                                </IconButton>
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => addWidget(widget.id)}
                                  aria-label={`Add ${widget.displayName}`}
                                >
                                  Add
                                </Button>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closePicker} aria-label="Close widget picker">
              Close
            </Button>
          </DialogActions>
        </Box>
      </FocusTrap>
    </Dialog>
  );
};

export default AnalyticsWidgetPicker;
