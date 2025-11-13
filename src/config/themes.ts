import type { PresetColor } from 'types/config';

/**
 * Available preset themes in the application
 * This list should match the themes available in src/themes/palette.tsx
 */
export interface ThemeInfo {
  id: PresetColor;
  name: string;
  description?: string;
}

/**
 * List of all available preset themes (excluding 'custom')
 * These themes are defined in src/assets/scss/ and used in src/themes/palette.tsx
 */
export const PRESET_THEMES: ThemeInfo[] = [
  { id: 'allyvia', name: 'Allyvia', description: 'Default Allyvia theme' },
  { id: 'theme1', name: 'Theme 1', description: 'Preset theme 1' },
  { id: 'theme2', name: 'Theme 2', description: 'Preset theme 2' },
  { id: 'theme3', name: 'Theme 3', description: 'Preset theme 3' },
  { id: 'theme4', name: 'Theme 4', description: 'Preset theme 4' },
  { id: 'theme5', name: 'Theme 5', description: 'Preset theme 5' },
  { id: 'theme6', name: 'Theme 6', description: 'Preset theme 6' },
  { id: 'default', name: 'Default', description: 'Default theme' }
];

/**
 * Get theme info by ID
 */
export function getThemeInfo(themeId: PresetColor): ThemeInfo | undefined {
  return PRESET_THEMES.find((theme) => theme.id === themeId);
}

/**
 * Get theme name by ID
 */
export function getThemeName(themeId: PresetColor): string {
  const theme = getThemeInfo(themeId);
  return theme?.name || themeId;
}

/**
 * Get available themes for selection (excludes 'custom' and optionally 'default')
 */
export function getAvailableThemes(excludeDefault: boolean = false): ThemeInfo[] {
  return PRESET_THEMES.filter((theme) => {
    if (theme.id === 'custom') return false;
    if (excludeDefault && theme.id === 'default') return false;
    return true;
  });
}
