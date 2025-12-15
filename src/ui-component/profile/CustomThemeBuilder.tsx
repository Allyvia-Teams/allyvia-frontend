import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  TextField,
  Divider,
  Tab,
  Tabs,
  Alert,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar
} from '@mui/material';
import { IconCheck, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';
import {
  CustomThemeColors,
  saveCustomTheme,
  loadCustomTheme,
  getDefaultCustomTheme,
  hasCustomTheme,
  deleteCustomTheme
} from 'utils/customTheme';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import ColorPicker from './ColorPicker';

interface CustomThemeBuilderProps {
  onThemeApplied: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`theme-tabpanel-${index}`} aria-labelledby={`theme-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CustomThemeBuilder({ onThemeApplied }: CustomThemeBuilderProps) {
  const { mode, presetColor, onChangePresetColor } = useConfig();
  const [activeTab, setActiveTab] = useState(0);
  const [themeName, setThemeName] = useState('My Custom Theme');
  const [colors, setColors] = useState<CustomThemeColors>(getDefaultCustomTheme());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const isDark = mode === ThemeMode.DARK;
  const hasCustom = hasCustomTheme();

  // Load existing custom theme on mount
  useEffect(() => {
    const existing = loadCustomTheme();
    if (existing) {
      setColors(existing);
    } else {
      setColors(getDefaultCustomTheme());
    }
    setSaveSuccess(false);
    setHasChanges(false);
  }, []);

  // Check if colors have changed
  useEffect(() => {
    const existing = loadCustomTheme();
    if (existing) {
      setHasChanges(JSON.stringify(existing) !== JSON.stringify(colors));
    } else {
      setHasChanges(JSON.stringify(colors) !== JSON.stringify(getDefaultCustomTheme()));
    }
  }, [colors]);

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    saveCustomTheme(colors);
    setSaveSuccess(true);
    setHasChanges(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleApply = () => {
    setShowComingSoon(true);
    // Coming soon - theme application will be available in a future update
    // saveCustomTheme(colors);
    // onChangePresetColor('custom');
    // onThemeApplied();
  };

  const handleReset = () => {
    setColors(getDefaultCustomTheme());
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete your custom theme? This action cannot be undone.')) {
      deleteCustomTheme();
      setColors(getDefaultCustomTheme());
      if (presetColor === 'custom') {
        onChangePresetColor('allyvia'); // Fallback to default theme
      }
      setSaveSuccess(false);
      setHasChanges(false);
    }
  };

  // Preview colors based on current mode
  const previewColors = useMemo(() => {
    return {
      primary: isDark ? colors.darkPrimaryMain : colors.primaryMain,
      secondary: isDark ? colors.darkSecondaryMain : colors.secondaryMain,
      success: colors.successMain,
      error: colors.errorMain,
      warning: colors.warningMain
    };
  }, [colors, isDark]);

  // Sample data for table preview
  const sampleTableData = [
    { id: 1, name: 'Item A', status: 'Active', value: 150 },
    { id: 2, name: 'Item B', status: 'Pending', value: 200 },
    { id: 3, name: 'Item C', status: 'Inactive', value: 75 }
  ];

  return (
    <Box>
      {/* Collapsible Content - No header, already handled by parent */}
      <Stack spacing={3}>
        {saveSuccess && (
          <Alert severity="success" icon={<IconCheck size={20} />} onClose={() => setSaveSuccess(false)}>
            Custom theme saved successfully!
          </Alert>
        )}

        {hasCustom && (
          <Alert severity="info">
            You have a saved custom theme.{' '}
            <Button size="small" color="error" onClick={handleDelete} sx={{ ml: 1 }}>
              Delete Theme
            </Button>
          </Alert>
        )}

        {/* Theme Name */}
        <TextField label="Theme Name" value={themeName} onChange={(e) => setThemeName(e.target.value)} fullWidth size="small" />

        {/* Tabs for Light/Dark mode */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Light Mode Colors" />
            <Tab label="Dark Mode Colors" />
            <Tab label="Preview" />
          </Tabs>
        </Box>

        {/* Light Mode Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Primary Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker label="Primary Light" value={colors.primaryLight} onChange={(v) => handleColorChange('primaryLight', v)} />
                  <ColorPicker label="Primary Main" value={colors.primaryMain} onChange={(v) => handleColorChange('primaryMain', v)} />
                  <ColorPicker label="Primary Dark" value={colors.primaryDark} onChange={(v) => handleColorChange('primaryDark', v)} />
                  <ColorPicker label="Primary 200" value={colors.primary200} onChange={(v) => handleColorChange('primary200', v)} />
                  <ColorPicker label="Primary 800" value={colors.primary800} onChange={(v) => handleColorChange('primary800', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Secondary Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker
                    label="Secondary Light"
                    value={colors.secondaryLight}
                    onChange={(v) => handleColorChange('secondaryLight', v)}
                  />
                  <ColorPicker
                    label="Secondary Main"
                    value={colors.secondaryMain}
                    onChange={(v) => handleColorChange('secondaryMain', v)}
                  />
                  <ColorPicker
                    label="Secondary Dark"
                    value={colors.secondaryDark}
                    onChange={(v) => handleColorChange('secondaryDark', v)}
                  />
                  <ColorPicker label="Secondary 200" value={colors.secondary200} onChange={(v) => handleColorChange('secondary200', v)} />
                  <ColorPicker label="Secondary 800" value={colors.secondary800} onChange={(v) => handleColorChange('secondary800', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Success Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker label="Success Light" value={colors.successLight} onChange={(v) => handleColorChange('successLight', v)} />
                  <ColorPicker label="Success Main" value={colors.successMain} onChange={(v) => handleColorChange('successMain', v)} />
                  <ColorPicker label="Success Dark" value={colors.successDark} onChange={(v) => handleColorChange('successDark', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Error Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker label="Error Light" value={colors.errorLight} onChange={(v) => handleColorChange('errorLight', v)} />
                  <ColorPicker label="Error Main" value={colors.errorMain} onChange={(v) => handleColorChange('errorMain', v)} />
                  <ColorPicker label="Error Dark" value={colors.errorDark} onChange={(v) => handleColorChange('errorDark', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Warning Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker label="Warning Light" value={colors.warningLight} onChange={(v) => handleColorChange('warningLight', v)} />
                  <ColorPicker label="Warning Main" value={colors.warningMain} onChange={(v) => handleColorChange('warningMain', v)} />
                  <ColorPicker label="Warning Dark" value={colors.warningDark} onChange={(v) => handleColorChange('warningDark', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Background & Paper
                </Typography>
                <Stack spacing={2} direction="row">
                  <Box sx={{ flex: 1 }}>
                    <ColorPicker label="Paper" value={colors.paper} onChange={(v) => handleColorChange('paper', v)} />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Dark Mode Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Dark Primary Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker
                    label="Dark Primary Light"
                    value={colors.darkPrimaryLight}
                    onChange={(v) => handleColorChange('darkPrimaryLight', v)}
                  />
                  <ColorPicker
                    label="Dark Primary Main"
                    value={colors.darkPrimaryMain}
                    onChange={(v) => handleColorChange('darkPrimaryMain', v)}
                  />
                  <ColorPicker
                    label="Dark Primary Dark"
                    value={colors.darkPrimaryDark}
                    onChange={(v) => handleColorChange('darkPrimaryDark', v)}
                  />
                  <ColorPicker
                    label="Dark Primary 200"
                    value={colors.darkPrimary200}
                    onChange={(v) => handleColorChange('darkPrimary200', v)}
                  />
                  <ColorPicker
                    label="Dark Primary 800"
                    value={colors.darkPrimary800}
                    onChange={(v) => handleColorChange('darkPrimary800', v)}
                  />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Dark Secondary Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker
                    label="Dark Secondary Light"
                    value={colors.darkSecondaryLight}
                    onChange={(v) => handleColorChange('darkSecondaryLight', v)}
                  />
                  <ColorPicker
                    label="Dark Secondary Main"
                    value={colors.darkSecondaryMain}
                    onChange={(v) => handleColorChange('darkSecondaryMain', v)}
                  />
                  <ColorPicker
                    label="Dark Secondary Dark"
                    value={colors.darkSecondaryDark}
                    onChange={(v) => handleColorChange('darkSecondaryDark', v)}
                  />
                  <ColorPicker
                    label="Dark Secondary 200"
                    value={colors.darkSecondary200}
                    onChange={(v) => handleColorChange('darkSecondary200', v)}
                  />
                  <ColorPicker
                    label="Dark Secondary 800"
                    value={colors.darkSecondary800}
                    onChange={(v) => handleColorChange('darkSecondary800', v)}
                  />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Dark Background
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker label="Dark Paper" value={colors.darkPaper} onChange={(v) => handleColorChange('darkPaper', v)} />
                  <ColorPicker
                    label="Dark Background"
                    value={colors.darkBackground}
                    onChange={(v) => handleColorChange('darkBackground', v)}
                  />
                  <ColorPicker label="Dark Level 1" value={colors.darkLevel1} onChange={(v) => handleColorChange('darkLevel1', v)} />
                  <ColorPicker label="Dark Level 2" value={colors.darkLevel2} onChange={(v) => handleColorChange('darkLevel2', v)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Dark Text Colors
                </Typography>
                <Stack spacing={2}>
                  <ColorPicker
                    label="Dark Text Title"
                    value={colors.darkTextTitle}
                    onChange={(v) => handleColorChange('darkTextTitle', v)}
                  />
                  <ColorPicker
                    label="Dark Text Primary"
                    value={colors.darkTextPrimary}
                    onChange={(v) => handleColorChange('darkTextPrimary', v)}
                  />
                  <ColorPicker
                    label="Dark Text Secondary"
                    value={colors.darkTextSecondary}
                    onChange={(v) => handleColorChange('darkTextSecondary', v)}
                  />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Preview Tab */}
        <TabPanel value={activeTab} index={2}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Stack spacing={3}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                Theme Preview
              </Typography>
              <Divider />

              {/* Stats Cards */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Stats Cards
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <AllyviaStats title="Total Revenue" value="$12,345" theme="default" size="small" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <AllyviaStats title="Orders" value="128" theme="success" size="small" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <AllyviaStats title="Alerts" value="5" theme="warning" size="small" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <AllyviaStats title="Errors" value="2" theme="alert" size="small" />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Buttons and Chips */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Buttons & Chips
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 2 }}>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: previewColors.primary, '&:hover': { bgcolor: previewColors.primary, opacity: 0.9 } }}
                  >
                    Primary Button
                  </Button>
                  <Button variant="outlined" sx={{ borderColor: previewColors.primary, color: previewColors.primary }}>
                    Outlined Button
                  </Button>
                  <Chip label="Success" sx={{ bgcolor: previewColors.success, color: 'white' }} />
                  <Chip label="Warning" sx={{ bgcolor: previewColors.warning, color: isDark ? '#fff' : '#000' }} />
                  <Chip label="Error" sx={{ bgcolor: previewColors.error, color: 'white' }} />
                </Stack>
              </Box>

              <Divider />

              {/* Table Preview */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Table
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleTableData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="right">${row.value}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              size="small"
                              color={row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          </Paper>
        </TabPanel>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleReset} variant="outlined" color="inherit" size="small">
              Reset to Default
            </Button>
            {hasCustom && (
              <Button onClick={handleDelete} variant="outlined" color="error" size="small" startIcon={<IconTrash size={18} />}>
                Delete Theme
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleSave} variant="outlined" size="small" startIcon={<IconDeviceFloppy size={18} />} disabled={!hasChanges}>
              Save
            </Button>
            <Button onClick={handleApply} variant="contained" size="small" sx={{ color: 'white' }} startIcon={<IconCheck size={18} />}>
              Apply Theme
            </Button>
          </Box>
        </Box>
      </Stack>

      {/* Coming Soon Snackbar */}
      <Snackbar
        open={showComingSoon}
        autoHideDuration={3000}
        onClose={() => setShowComingSoon(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowComingSoon(false)} severity="info" sx={{ width: '100%' }}>
          Theme application is coming soon!
        </Alert>
      </Snackbar>
    </Box>
  );
}
