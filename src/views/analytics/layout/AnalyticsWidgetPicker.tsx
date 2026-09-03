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
import CloseIcon from '@mui/icons-material/Close';
import { ANALYTICS_TAB_LABELS } from './tabLabels';
import { widgetsForTab } from './analyticsLayoutRules';
import { useAnalyticsLayout } from './AnalyticsLayoutContext';

const AnalyticsWidgetPicker: React.FC = () => {
  const { pickerOpen, closePicker, activeTab, isWidgetInLayout, addWidget, removeWidget } = useAnalyticsLayout();

  // Only this tab's widgets are offered. The tabs are separate dashboards with
  // separate data sources - the employee widgets in particular read a context
  // that only the Employee tab mounts, so adding one elsewhere would throw when
  // the grid rendered it.
  const widgets = useMemo(() => widgetsForTab(activeTab), [activeTab]);

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
            {widgets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No widgets are available for this tab yet.
              </Typography>
            ) : (
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
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            onClick={() => removeWidget(widget.id)}
                            aria-label={`Remove ${widget.displayName}`}
                          >
                            Remove
                          </Button>
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
            )}
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
