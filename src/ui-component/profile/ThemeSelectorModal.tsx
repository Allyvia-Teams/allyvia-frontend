import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  Grid,
  Paper,
  Button,
  IconButton,
  Chip,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Snackbar,
  Alert
} from '@mui/material';
import { IconX, IconPalette, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import useConfig from 'hooks/useConfig';
import type { PresetColor } from 'types/config';
import { ThemeMode } from 'config';
import type { ColorProps } from 'types';
import { getAvailableThemes } from 'config/themes';
import AllyviaStats from 'ui-component/common/AllyviaStats';

// Import theme SCSS modules (same as themes/palette.tsx)
import allyviaTheme from 'assets/scss/_allyvia_theme.module.scss';
import theme1Colors from 'assets/scss/_theme1.module.scss';
import theme2Colors from 'assets/scss/_theme2.module.scss';
import theme3Colors from 'assets/scss/_theme3.module.scss';
import theme4Colors from 'assets/scss/_theme4.module.scss';
import theme5Colors from 'assets/scss/_theme5.module.scss';
import theme6Colors from 'assets/scss/_theme6.module.scss';
import defaultColors from 'assets/scss/_themes-vars.module.scss';

// Helper function to get theme colors based on preset (same logic as themes/palette.tsx)
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

// Helper function to get color values based on mode (same logic as themes/palette.tsx)
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

interface ThemeSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentTheme: PresetColor;
  onThemeSelect: (theme: PresetColor) => void;
}

// Preview Widget Component
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
    { id: 1, name: 'Item A', status: 'Active', value: '$1,234', category: 'Inventory' },
    { id: 2, name: 'Item B', status: 'Inactive', value: '$5,678', category: 'Finance' },
    { id: 3, name: 'Item C', status: 'Active', value: '$9,012', category: 'Sales' }
  ];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: 'background.paper',
        height: '100%',
        overflow: 'auto',
        maxHeight: '600px'
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            Theme Preview: {themeName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See how your theme looks across different components
          </Typography>
        </Box>

        <Divider />

        {/* AllyviaStats Cards */}
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
              sx={{
                bgcolor: themeColors.primary,
                '&:hover': { bgcolor: themeColors.primary, opacity: 0.9 }
              }}
            >
              Primary Button
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: themeColors.primary,
                color: themeColors.primary,
                '&:hover': { borderColor: themeColors.primary, bgcolor: `${themeColors.primary}10` }
              }}
            >
              Outlined Button
            </Button>
            <Button variant="text" sx={{ color: themeColors.primary }}>
              Text Button
            </Button>
            <Chip label="Success" sx={{ bgcolor: themeColors.success, color: 'white' }} size="small" />
            <Chip label="Warning" sx={{ bgcolor: themeColors.warning, color: isDark ? '#fff' : '#000' }} size="small" />
            <Chip label="Error" sx={{ bgcolor: themeColors.error, color: 'white' }} size="small" />
            <Chip label="Primary" sx={{ bgcolor: themeColors.primary, color: 'white' }} size="small" />
          </Stack>
        </Box>

        <Divider />

        {/* Table Preview */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Data Table
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.50',
                    '& .MuiTableCell-head': {
                      fontWeight: 600,
                      color: 'text.primary'
                    }
                  }}
                >
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'action.hover'
                      }
                    }}
                  >
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          bgcolor: row.status === 'Active' ? themeColors.success : 'grey.300',
                          color: row.status === 'Active' ? 'white' : 'text.primary'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: themeColors.primary }}>
                      {row.value}
                    </TableCell>
                    <TableCell>{row.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider />

        {/* Typography Preview */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Typography
          </Typography>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ color: themeColors.primary }}>
              Heading 4 - Primary Color
            </Typography>
            <Typography variant="h6">Heading 6 - Default Text</Typography>
            <Typography variant="body1">Body text with regular styling</Typography>
            <Typography variant="body2" color="text.secondary">
              Secondary body text for descriptions
            </Typography>
            <Typography variant="caption" sx={{ color: themeColors.error }}>
              Caption text with error color
            </Typography>
          </Stack>
        </Box>

        <Divider />

        {/* Color Palette Preview */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Color Palette
          </Typography>
          <Grid container spacing={1}>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: themeColors.primary,
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  Primary
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: themeColors.secondary,
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  Secondary
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: themeColors.success,
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  Success
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: themeColors.warning,
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#fff' : '#000',
                    fontWeight: 600
                  }}
                >
                  Warning
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 50,
                    bgcolor: themeColors.error,
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  Error
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Paper>
  );
};

export default function ThemeSelectorModal({ open, onClose, currentTheme, onThemeSelect }: ThemeSelectorModalProps) {
  const { mode } = useConfig();

  // Get available themes from config (excludes 'custom' and 'default')
  const availableThemes = getAvailableThemes(true); // Exclude 'default' theme

  // Helper to get a valid theme (if currentTheme is not available, use first available)
  const getValidTheme = useCallback(
    (themeId: PresetColor): PresetColor => {
      return availableThemes.find((t) => t.id === themeId)?.id || availableThemes[0]?.id || 'allyvia';
    },
    [availableThemes]
  );

  const [previewTheme, setPreviewTheme] = useState<PresetColor>(() => {
    const valid = availableThemes.find((t) => t.id === currentTheme)?.id || availableThemes[0]?.id || 'allyvia';
    return valid;
  });
  const [themesExpanded, setThemesExpanded] = useState(true);

  // Update preview theme when currentTheme changes (e.g., when modal opens)
  useEffect(() => {
    if (open) {
      const validTheme = getValidTheme(currentTheme);
      setPreviewTheme(validTheme);
      setThemesExpanded(true);
    }
  }, [currentTheme, open, getValidTheme]);

  // Get theme colors based on current mode (respects dark/light mode)
  const getThemeColorsForDisplay = (themeId: PresetColor) => {
    return getThemeColorValues(themeId, mode);
  };

  const selectedThemeColors = useMemo(() => getThemeColorsForDisplay(previewTheme), [previewTheme, mode]);

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const themeId = event.target.value as PresetColor;
    setPreviewTheme(themeId);
  };

  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleApply = () => {
    setShowComingSoon(true);
    // Coming soon - theme application will be available in a future update
    // onThemeSelect(previewTheme);
    // onClose();
  };

  const handleCancel = () => {
    // Reset to original theme
    setPreviewTheme(getValidTheme(currentTheme));
    onClose();
  };

  const selectedThemeName = availableThemes.find((t) => t.id === previewTheme)?.name || 'Unknown';

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconPalette size={24} />
            <Typography variant="h5" fontWeight={600}>
              Select Theme (Beta)
            </Typography>
          </Box>
          <IconButton onClick={handleCancel} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Left Side - Preview Widget */}
          <Grid size={{ xs: 12, md: 8 }}>
            <ThemePreview themeColors={selectedThemeColors} themeName={selectedThemeName} />
          </Grid>

          {/* Right Side - Theme Selection with Radio Buttons */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  mb: themesExpanded ? 2 : 0
                }}
                onClick={() => setThemesExpanded(!themesExpanded)}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Available Themes ({availableThemes.length})
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setThemesExpanded(!themesExpanded);
                  }}
                >
                  {themesExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </IconButton>
              </Box>
              <Collapse in={themesExpanded}>
                <RadioGroup value={previewTheme} onChange={handleThemeChange}>
                  <Stack spacing={1.5}>
                    {availableThemes.map((themeInfo) => {
                      const colors = getThemeColorsForDisplay(themeInfo.id);
                      const isSelected = themeInfo.id === previewTheme;
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
                          onClick={() => setPreviewTheme(themeInfo.id)}
                        >
                          <FormControlLabel
                            value={themeInfo.id}
                            control={<Radio />}
                            label={
                              <Box sx={{ width: '100%', ml: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                  {themeInfo.name}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                  <Box
                                    sx={{
                                      flex: 1,
                                      height: 32,
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
                                      height: 32,
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
                                      height: 32,
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
                                      height: 32,
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
                                      height: 32,
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
              </Collapse>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" sx={{ color: 'white' }}>
          Apply Theme
        </Button>
      </DialogActions>

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
    </Dialog>
  );
}
