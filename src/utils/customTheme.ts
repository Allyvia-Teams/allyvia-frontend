import type { ColorProps } from 'types';
import defaultColor from 'assets/scss/_themes-vars.module.scss';

const CUSTOM_THEME_STORAGE_KEY = 'allyvia-custom-theme';

export interface CustomThemeColors extends ColorProps {
  // Light mode colors
  paper: string;
  primaryLight: string;
  primaryMain: string;
  primaryDark: string;
  primary200: string;
  primary800: string;
  secondaryLight: string;
  secondaryMain: string;
  secondaryDark: string;
  secondary200: string;
  secondary800: string;
  successLight: string;
  success200: string;
  successMain: string;
  successDark: string;
  errorLight: string;
  errorMain: string;
  errorDark: string;
  orangeLight: string;
  orangeMain: string;
  orangeDark: string;
  warningLight: string;
  warningMain: string;
  warningDark: string;
  grey50: string;
  grey100: string;
  grey200: string;
  grey300: string;
  grey500: string;
  grey600: string;
  grey700: string;
  grey900: string;
  goldDark: string;
  gold200: string;
  gold800: string;
  goldText: string;
  // Dark mode colors
  darkPaper: string;
  darkBackground: string;
  darkLevel1: string;
  darkLevel2: string;
  darkPrimaryLight: string;
  darkPrimaryMain: string;
  darkPrimaryDark: string;
  darkPrimary200: string;
  darkPrimary800: string;
  darkSecondaryLight: string;
  darkSecondaryMain: string;
  darkSecondaryDark: string;
  darkSecondary200: string;
  darkSecondary800: string;
  darkTextTitle: string;
  darkTextPrimary: string;
  darkTextSecondary: string;
}

/**
 * Get default custom theme colors (based on default theme)
 */
export function getDefaultCustomTheme(): CustomThemeColors {
  return {
    paper: defaultColor.paper,
    primaryLight: defaultColor.primaryLight,
    primaryMain: defaultColor.primaryMain,
    primaryDark: defaultColor.primaryDark,
    primary200: defaultColor.primary200,
    primary800: defaultColor.primary800,
    secondaryLight: defaultColor.secondaryLight,
    secondaryMain: defaultColor.secondaryMain,
    secondaryDark: defaultColor.secondaryDark,
    secondary200: defaultColor.secondary200,
    secondary800: defaultColor.secondary800,
    successLight: defaultColor.successLight,
    success200: defaultColor.success200,
    successMain: defaultColor.successMain,
    successDark: defaultColor.successDark,
    errorLight: defaultColor.errorLight,
    errorMain: defaultColor.errorMain,
    errorDark: defaultColor.errorDark,
    orangeLight: defaultColor.orangeLight,
    orangeMain: defaultColor.orangeMain,
    orangeDark: defaultColor.orangeDark,
    warningLight: defaultColor.warningLight,
    warningMain: defaultColor.warningMain,
    warningDark: defaultColor.warningDark,
    grey50: defaultColor.grey50,
    grey100: defaultColor.grey100,
    grey200: defaultColor.grey200,
    grey300: defaultColor.grey300,
    grey500: defaultColor.grey500,
    grey600: defaultColor.grey600,
    grey700: defaultColor.grey700,
    grey900: defaultColor.grey900,
    goldDark: (defaultColor as any).goldDark || '#fff3c1',
    gold200: (defaultColor as any).gold200 || '#ffdd6e',
    gold800: (defaultColor as any).gold800 || '#ffe683',
    goldText: (defaultColor as any).goldText || '#3d3d3d',
    darkPaper: defaultColor.darkPaper,
    darkBackground: defaultColor.darkBackground,
    darkLevel1: defaultColor.darkLevel1,
    darkLevel2: defaultColor.darkLevel2,
    darkPrimaryLight: defaultColor.darkPrimaryLight,
    darkPrimaryMain: defaultColor.darkPrimaryMain,
    darkPrimaryDark: defaultColor.darkPrimaryDark,
    darkPrimary200: defaultColor.darkPrimary200,
    darkPrimary800: defaultColor.darkPrimary800,
    darkSecondaryLight: defaultColor.darkSecondaryLight,
    darkSecondaryMain: defaultColor.darkSecondaryMain,
    darkSecondaryDark: defaultColor.darkSecondaryDark,
    darkSecondary200: defaultColor.darkSecondary200,
    darkSecondary800: defaultColor.darkSecondary800,
    darkTextTitle: defaultColor.darkTextTitle,
    darkTextPrimary: defaultColor.darkTextPrimary,
    darkTextSecondary: defaultColor.darkTextSecondary
  };
}

/**
 * Save custom theme to localStorage
 */
export function saveCustomTheme(colors: CustomThemeColors): void {
  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(colors));
  } catch (error) {
    console.error('Failed to save custom theme:', error);
  }
}

/**
 * Load custom theme from localStorage
 */
export function loadCustomTheme(): CustomThemeColors | null {
  try {
    const stored = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CustomThemeColors;
    }
  } catch (error) {
    console.error('Failed to load custom theme:', error);
  }
  return null;
}

/**
 * Check if custom theme exists
 */
export function hasCustomTheme(): boolean {
  return localStorage.getItem(CUSTOM_THEME_STORAGE_KEY) !== null;
}

/**
 * Delete custom theme
 */
export function deleteCustomTheme(): void {
  try {
    localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to delete custom theme:', error);
  }
}
