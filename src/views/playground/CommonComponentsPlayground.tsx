import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import AllyviaWeekSlider from 'ui-component/common/AllyviaWeekSlider';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const CommonComponentsPlayground: React.FC = () => {
  // AllyviaStats controls
  const [statsTitle, setStatsTitle] = useState('Total Revenue');
  const [statsValue, setStatsValue] = useState('125,430');
  const [statsTheme, setStatsTheme] = useState<'default' | 'warning' | 'alert' | 'success'>('default');

  // AllyviaWeekSlider controls
  const [weekSliderShowTitle, setWeekSliderShowTitle] = useState(true);
  const [weekSliderTitle, setWeekSliderTitle] = useState('Week of Jan 15, 2024');

  // AllyviaEmpty controls
  const [emptyType, setEmptyType] = useState<
    'table' | 'chart' | 'page' | 'form' | 'list' | 'card' | 'grid' | 'dashboard' | 'search' | 'filter' | 'data' | 'content' | 'default'
  >('table');
  const [emptySkeletonType, setEmptySkeletonType] = useState<
    'table' | 'chart' | 'card' | 'list' | 'grid' | 'text' | 'circular' | 'rectangular' | 'wave' | 'pulse'
  >('table');
  const [emptyIsLoading, setEmptyIsLoading] = useState(false);
  const [emptyIsEmpty, setEmptyIsEmpty] = useState(true);
  const [emptyHeight, setEmptyHeight] = useState(200);

  const themeOptions = [
    { value: 'default', label: 'Default' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'alert', label: 'Alert' }
  ];

  const emptyTypeOptions = [
    'table',
    'chart',
    'page',
    'form',
    'list',
    'card',
    'grid',
    'dashboard',
    'search',
    'filter',
    'data',
    'content',
    'default'
  ];

  const skeletonTypeOptions = ['table', 'chart', 'card', 'list', 'grid', 'text', 'circular', 'rectangular', 'wave', 'pulse'];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Common Components Playground
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* AllyviaStats */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AllyviaStats Component
              </Typography>

              {/* Controls */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Title"
                  value={statsTitle}
                  onChange={(e) => setStatsTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Value"
                  value={statsValue}
                  onChange={(e) => setStatsValue(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Theme</InputLabel>
                  <Select value={statsTheme} label="Theme" onChange={(e) => setStatsTheme(e.target.value as any)}>
                    {themeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Preview */}
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 1,
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <AllyviaStats title={statsTitle} value={statsValue} theme={statsTheme} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* AllyviaWeekSlider */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AllyviaWeekSlider Component
              </Typography>

              {/* Controls */}
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={<Switch checked={weekSliderShowTitle} onChange={(e) => setWeekSliderShowTitle(e.target.checked)} />}
                  label="Show Title"
                />

                {weekSliderShowTitle && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Title"
                    value={weekSliderTitle}
                    onChange={(e) => setWeekSliderTitle(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                )}

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Week Slider (controlled internally)
                </Typography>
              </Box>

              {/* Preview */}
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 1,
                  p: 2
                }}
              >
                <AllyviaWeekSlider onWeekChange={(weekDates) => console.log('Week changed:', weekDates)}>
                  {(weekDates) => (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Week: {weekDates.start.toLocaleDateString()} - {weekDates.end.toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Week content goes here
                      </Typography>
                    </Box>
                  )}
                </AllyviaWeekSlider>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* AllyviaEmpty */}
        <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AllyviaEmpty Component
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Controls */}
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={<Switch checked={emptyIsLoading} onChange={(e) => setEmptyIsLoading(e.target.checked)} />}
                      label="Loading"
                    />
                    <FormControlLabel
                      control={<Switch checked={emptyIsEmpty} onChange={(e) => setEmptyIsEmpty(e.target.checked)} />}
                      label="Empty"
                    />
                  </Box>

                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Empty Type</InputLabel>
                    <Select value={emptyType} label="Empty Type" onChange={(e) => setEmptyType(e.target.value as any)}>
                      {emptyTypeOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Skeleton Type</InputLabel>
                    <Select value={emptySkeletonType} label="Skeleton Type" onChange={(e) => setEmptySkeletonType(e.target.value as any)}>
                      {skeletonTypeOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography gutterBottom>Height: {emptyHeight}px</Typography>
                  <Slider
                    value={emptyHeight}
                    onChange={(e, value) => setEmptyHeight(value as number)}
                    min={100}
                    max={400}
                    step={50}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                {/* Preview */}
                <Box sx={{ flex: '2 1 400px', minWidth: 400 }}>
                  <Box
                    sx={{
                      border: '1px dashed #ccc',
                      borderRadius: 1,
                      p: 2,
                      minHeight: emptyHeight + 50,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <AllyviaEmpty
                      isEmpty={emptyIsEmpty}
                      isLoading={emptyIsLoading}
                      type={emptyType}
                      skeletonType={emptySkeletonType}
                      height={emptyHeight}
                      showAction={true}
                      action={
                        <Button variant="contained" color="primary" size="small">
                          Action Button
                        </Button>
                      }
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Component List */}
        <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Common Components
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="AllyviaStats" color="primary" />
                <Chip label="AllyviaWeekSlider" color="primary" />
                <Chip label="AllyviaEmpty" color="primary" />
                <Chip label="AllyviaDateRangePicker" color="secondary" />
                <Chip label="AllyviaTable" color="secondary" />
                <Chip label="AllyviaChart" color="secondary" />
                <Chip label="AllyviaModal" color="secondary" />
                <Chip label="AllyviaForm" color="secondary" />
                <Chip label="AllyviaCard" color="secondary" />
                <Chip label="AllyviaButton" color="secondary" />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                This playground allows you to test and configure common components with real-time parameter changes. Use the controls above
                to modify component properties and see the results instantly.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default CommonComponentsPlayground;
