import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  Box,
  Paper,
  Grid,
  styled,
  Button,
  Divider,
  Collapse,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel as MuiFormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import type { SwitchProps } from '@mui/material/Switch';
import { IconSun, IconLayoutSidebar, IconPalette, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';
import type { PresetColor } from 'types/config';
import { getThemeName, getAvailableThemes } from 'config/themes';
import CustomThemeBuilder from './CustomThemeBuilder';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { loadCustomTheme } from 'utils/customTheme';

// Import theme SCSS modules for color display
import allyviaTheme from 'assets/scss/_allyvia_theme.module.scss';
import theme1Colors from 'assets/scss/_theme1.module.scss';
import theme2Colors from 'assets/scss/_theme2.module.scss';
import theme3Colors from 'assets/scss/_theme3.module.scss';
import theme4Colors from 'assets/scss/_theme4.module.scss';
import theme5Colors from 'assets/scss/_theme5.module.scss';
import theme6Colors from 'assets/scss/_theme6.module.scss';
import defaultColors from 'assets/scss/_themes-vars.module.scss';
import type { ColorProps } from 'types';

// Helper function to get theme colors based on preset
function getThemeColors(presetColor: PresetColor): ColorProps {
  switch (presetColor) {
    case 'allyvia':
      return allyviaTheme;
    case 'theme1':
      return theme1Colors;
    case 'theme2':
      return theme2Colors;
    case 'theme3':
      return theme3Colors;
    case 'theme4':
      return theme4Colors;
    case 'theme5':
      return theme5Colors;
    case 'theme6':
      return theme6Colors;
    case 'default':
    default:
      return defaultColors;
  }
}

// Helper function to get color values based on mode
function getThemeColorValues(presetColor: PresetColor, mode: ThemeMode) {
  const colors = getThemeColors(presetColor);
  const isDark = mode === ThemeMode.DARK;

  return {
    primary: isDark ? colors.darkPrimaryMain : colors.primaryMain,
    secondary: isDark ? colors.darkSecondaryMain : colors.secondaryMain,
    success: colors.successMain,
    error: colors.errorMain,
    warning: colors.warningMain
  };
}

// Theme Preview Component
interface ThemePreviewProps {
  themeColors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
  };
  themeName: string;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ themeColors, themeName }) => {
  const { mode } = useConfig();
  const isDark = mode === ThemeMode.DARK;

  // Sample table data
  const tableData = [
    { id: 1, name: 'Item A', status: 'Active', value: '$1,234' },
    { id: 2, name: 'Item B', status: 'Pending', value: '$5,678' },
    { id: 3, name: 'Item C', status: 'Inactive', value: '$9,012' }
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.paper' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            Preview: {themeName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            See how your theme looks
          </Typography>
        </Box>

        <Divider />

        {/* Stats Cards */}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <AllyviaStats title="Revenue" value="$12,345" theme="default" size="small" />
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

        <Divider />

        {/* Buttons and Chips */}
        <Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1.5 }}>
            <Button
              variant="contained"
              size="small"
              sx={{
                bgcolor: themeColors.primary,
                '&:hover': { bgcolor: themeColors.primary, opacity: 0.9 }
              }}
            >
              Primary
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderColor: themeColors.primary,
                color: themeColors.primary
              }}
            >
              Outlined
            </Button>
            <Chip label="Success" sx={{ bgcolor: themeColors.success, color: 'white' }} size="small" />
            <Chip label="Warning" sx={{ bgcolor: themeColors.warning, color: isDark ? '#fff' : '#000' }} size="small" />
            <Chip label="Error" sx={{ bgcolor: themeColors.error, color: 'white' }} size="small" />
          </Stack>
        </Box>

        <Divider />

        {/* Table Preview */}
        <Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.50',
                    '& .MuiTableCell-head': {
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }
                  }}
                >
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          bgcolor: row.status === 'Active' ? themeColors.success : 'grey.300',
                          color: row.status === 'Active' ? 'white' : 'text.primary',
                          height: '20px',
                          fontSize: '0.65rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: themeColors.primary, fontSize: '0.75rem' }}>
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Paper>
  );
};

// Custom styled switch for theme mode (Light/Dark) - larger version similar to MaterialUISwitch
const ThemeModeSwitch = styled((props: SwitchProps) => <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />)(
  ({ theme }) => ({
    width: 80,
    height: 44,
    padding: 0,
    '& .MuiSwitch-switchBase': {
      padding: 0,
      margin: 4,
      transitionDuration: '300ms',
      '&.Mui-checked': {
        transform: 'translateX(36px)',
        color: '#fff',
        '& + .MuiSwitch-track': {
          backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#1976d2',
          opacity: 1,
          border: 0
        },
        '&.Mui-disabled + .MuiSwitch-track': {
          opacity: 0.5
        }
      },
      '&.Mui-focusVisible .MuiSwitch-thumb': {
        color: '#33cf4d',
        border: '6px solid #fff'
      },
      '&.Mui-disabled .MuiSwitch-thumb': {
        color: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[100]
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: theme.palette.mode === 'dark' ? 0.3 : 0.7
      }
    },
    '& .MuiSwitch-thumb': {
      boxSizing: 'border-box',
      width: 36,
      height: 36,
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.2)',
      '&::before': {
        content: "''",
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '20px 20px'
      }
    },
    '& .MuiSwitch-track': {
      borderRadius: 44 / 2,
      backgroundColor: theme.palette.mode === 'dark' ? '#39393D' : '#E9E9EA',
      opacity: 1,
      transition: theme.transitions.create(['background-color'], {
        duration: 500
      }),
      position: 'relative',
      '&::before': {
        content: "''",
        position: 'absolute',
        top: '50%',
        left: 12,
        transform: 'translateY(-50%)',
        width: 20,
        height: 20,
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          theme.palette.mode === 'dark' ? '#fff' : '#ffa726'
        )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.7
      },
      '&::after': {
        content: "''",
        position: 'absolute',
        top: '50%',
        right: 12,
        transform: 'translateY(-50%)',
        width: 20,
        height: 20,
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          theme.palette.mode === 'dark' ? '#8796A5' : '#fff'
        )}" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.7
      }
    }
  })
);

type PreferencesWidgetProps = {
  editMode?: boolean;
  onSaved?: () => void;
};

/**
 * PreferencesWidget - UI preferences management widget
 *
 * Features:
 * - Theme mode selection (light/dark)
 * - Preset theme selection
 * - Custom theme builder
 * - Sidebar expansion control
 * - Live theme updates via ConfigContext
 * - Preferences are stored in localStorage via ConfigContext
 * - Always editable (not tied to edit mode)
 */
export default function PreferencesWidget({ editMode, onSaved }: PreferencesWidgetProps) {
  const { mode, miniDrawer, onChangeMode, onChangeMiniDrawer, presetColor, onChangePresetColor } = useConfig();
  const [themeSectionExpanded, setThemeSectionExpanded] = React.useState(false);
  const [customThemeBuilderExpanded, setCustomThemeBuilderExpanded] = React.useState(false);
  const [themeRefreshKey, setThemeRefreshKey] = React.useState(0);

  // Map ConfigContext values to local state
  const themeModeValue = mode === ThemeMode.DARK ? 'dark' : 'light';
  const sidebarExpanded = !miniDrawer;

  // Get current preset theme name (exclude 'custom')
  const isCustomTheme = presetColor === 'custom';
  const currentThemeName = isCustomTheme ? 'Custom Theme' : getThemeName(presetColor);

  // Get available themes (exclude 'custom' and 'default')
  const availableThemes = getAvailableThemes(true);

  // Get theme colors for display
  const getThemeColorsForDisplay = useCallback(
    (themeId: PresetColor) => {
      // Handle custom theme
      if (themeId === 'custom') {
        const customTheme = loadCustomTheme();
        if (customTheme) {
          const isDark = mode === ThemeMode.DARK;
          return {
            primary: isDark ? customTheme.darkPrimaryMain : customTheme.primaryMain,
            secondary: isDark ? customTheme.darkSecondaryMain : customTheme.secondaryMain,
            success: customTheme.successMain,
            error: customTheme.errorMain,
            warning: customTheme.warningMain
          };
        }
      }
      return getThemeColorValues(themeId, mode);
    },
    [mode]
  );

  // Get current theme colors for preview - reload custom theme on each render to get latest colors
  const currentThemeColors = useMemo(() => {
    if (presetColor === 'custom') {
      // For custom theme, always get fresh colors from localStorage
      const customTheme = loadCustomTheme();
      if (customTheme) {
        const isDark = mode === ThemeMode.DARK;
        return {
          primary: isDark ? customTheme.darkPrimaryMain : customTheme.primaryMain,
          secondary: isDark ? customTheme.darkSecondaryMain : customTheme.secondaryMain,
          success: customTheme.successMain,
          error: customTheme.errorMain,
          warning: customTheme.warningMain
        };
      }
      // Fallback to default if no custom theme
      return getThemeColorValues('allyvia', mode);
    }
    return getThemeColorsForDisplay(presetColor);
  }, [presetColor, mode, getThemeColorsForDisplay, themeRefreshKey]);

  const currentThemeDisplayName = isCustomTheme ? 'Custom Theme' : currentThemeName;

  const handleThemeSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onChangeMode(ThemeMode.DARK);
    } else {
      onChangeMode(ThemeMode.LIGHT);
    }
    onSaved?.();
  };

  const handleSidebar = (checked: boolean) => {
    onChangeMiniDrawer(!checked);
    onSaved?.();
  };

  const handleThemeSelect = (theme: PresetColor) => {
    onChangePresetColor(theme);
    // Collapse custom theme builder when a preset theme is selected
    if (theme !== 'custom') {
      setCustomThemeBuilderExpanded(false);
    }
    onSaved?.();
  };

  const handleCustomThemeApplied = () => {
    onChangePresetColor('custom');
    setCustomThemeBuilderExpanded(true);
    setThemeSectionExpanded(true);
    // Force refresh of theme colors for preview
    setThemeRefreshKey((prev) => prev + 1);
    onSaved?.();
  };

  const handleCreateCustomTheme = () => {
    // Select custom theme when clicking the custom theme card
    if (!isCustomTheme) {
      onChangePresetColor('custom');
      setCustomThemeBuilderExpanded(true);
    } else {
      // Toggle custom theme builder if already on custom theme
      setCustomThemeBuilderExpanded(!customThemeBuilderExpanded);
    }
    if (!themeSectionExpanded) {
      setThemeSectionExpanded(true);
    }
  };

  // Auto-expand custom theme builder if custom theme is active
  useEffect(() => {
    if (presetColor === 'custom') {
      setCustomThemeBuilderExpanded(true);
      if (!themeSectionExpanded) {
        setThemeSectionExpanded(true);
      }
    }
  }, [presetColor, themeSectionExpanded]);

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Theme Mode and Navigation - Side by Side */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <IconSun size={20} style={{ opacity: themeModeValue === 'light' ? 1 : 0.5 }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Theme Mode
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ color: themeModeValue === 'light' ? 'primary.main' : 'text.secondary' }}
                  >
                    Light
                  </Typography>
                  <FormControlLabel
                    control={<ThemeModeSwitch checked={themeModeValue === 'dark'} onChange={handleThemeSwitchChange} />}
                    label=""
                    sx={{ margin: 0 }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ color: themeModeValue === 'dark' ? 'primary.main' : 'text.secondary' }}
                  >
                    Dark
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <IconLayoutSidebar size={20} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Navigation
                  </Typography>
                </Box>

                <Box>
                  <FormControlLabel
                    control={<Switch checked={sidebarExpanded} onChange={(e) => handleSidebar(e.target.checked)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Keep sidebar expanded by default
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sidebar remains visible when navigating
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', margin: 0 }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider />

          {/* Theme Section - Combined Preset Theme and Custom Theme Builder */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => setThemeSectionExpanded(!themeSectionExpanded)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconPalette size={20} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Theme (Beta)
                </Typography>
                {isCustomTheme && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      ml: 0.5
                    }}
                  />
                )}
              </Box>
              <IconButton
                size="small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setThemeSectionExpanded(!themeSectionExpanded);
                }}
              >
                {themeSectionExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </IconButton>
            </Box>

            {/* Current Theme Display */}
            <Box sx={{ mb: themeSectionExpanded ? 2 : 0 }}>
              <Typography variant="body2" color="text.secondary">
                Current: <strong>{isCustomTheme ? 'Custom Theme' : currentThemeName}</strong>
              </Typography>
            </Box>

            {/* Theme Selection - Collapsible */}
            <Collapse in={themeSectionExpanded}>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  {/* Left Side - Theme Preview (3/4 space) */}
                  <Grid size={{ xs: 12, md: 9 }}>
                    <ThemePreview themeColors={currentThemeColors} themeName={currentThemeDisplayName} />

                    {/* Custom Theme Builder - Below Preview when custom theme is selected */}
                    {isCustomTheme && (
                      <Collapse in={customThemeBuilderExpanded}>
                        <Box sx={{ mt: 2 }}>
                          <CustomThemeBuilder onThemeApplied={handleCustomThemeApplied} />
                        </Box>
                      </Collapse>
                    )}
                  </Grid>

                  {/* Right Side - Vertical Theme List (1/4 space) */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Select Theme
                      </Typography>

                      <RadioGroup
                        value={isCustomTheme ? 'custom' : presetColor}
                        onChange={(e) => handleThemeSelect(e.target.value as PresetColor)}
                      >
                        <Stack spacing={1}>
                          {/* Preset Themes - Vertical List */}
                          {availableThemes.map((themeInfo) => {
                            const colors = getThemeColorsForDisplay(themeInfo.id);
                            const isSelected = !isCustomTheme && presetColor === themeInfo.id;
                            return (
                              <Paper
                                key={themeInfo.id}
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  border: 2,
                                  borderColor: isSelected ? 'primary.main' : 'divider',
                                  backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    boxShadow: 1
                                  }
                                }}
                                onClick={() => handleThemeSelect(themeInfo.id)}
                              >
                                <MuiFormControlLabel
                                  value={themeInfo.id}
                                  control={<Radio size="small" />}
                                  label={
                                    <Box sx={{ width: '100%', ml: 0.5 }}>
                                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                        {themeInfo.name}
                                      </Typography>
                                      <Stack direction="row" spacing={0.5}>
                                        <Box
                                          sx={{
                                            flex: 1,
                                            height: 18,
                                            bgcolor: colors.primary,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                          title="Primary"
                                        />
                                        <Box
                                          sx={{
                                            flex: 1,
                                            height: 18,
                                            bgcolor: colors.secondary,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                          title="Secondary"
                                        />
                                        <Box
                                          sx={{
                                            flex: 1,
                                            height: 18,
                                            bgcolor: colors.success,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                          title="Success"
                                        />
                                        <Box
                                          sx={{
                                            flex: 1,
                                            height: 18,
                                            bgcolor: colors.warning,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                          title="Warning"
                                        />
                                        <Box
                                          sx={{
                                            flex: 1,
                                            height: 18,
                                            bgcolor: colors.error,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                          title="Error"
                                        />
                                      </Stack>
                                    </Box>
                                  }
                                  sx={{ margin: 0, width: '100%' }}
                                />
                              </Paper>
                            );
                          })}
                        </Stack>
                      </RadioGroup>

                      {/* Create Custom Theme Button - At Bottom */}
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant={isCustomTheme ? 'contained' : 'outlined'}
                          fullWidth
                          startIcon={<IconPalette size={18} />}
                          onClick={handleCreateCustomTheme}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 1.25,
                            ...(isCustomTheme && { color: 'white' })
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Typography variant="body2" fontSize="0.85rem">
                              {isCustomTheme ? 'Custom Theme' : 'Create Custom'}
                            </Typography>
                            {isCustomTheme && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'success.main',
                                  ml: 0.5
                                }}
                              />
                            )}
                          </Box>
                        </Button>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Box>
        </Stack>
      </Paper>
    </>
  );
}
