// Chart color themes with cohesive color palettes
// Each theme has 10+ colors that work well together

export interface ChartColorTheme {
  colors: string[];
  name: string;
  description: string;
}

// Blue Theme - Alternating blue shades
const blueTheme: ChartColorTheme = {
  colors: [
    '#0d47a1',
    '#42a5f5',
    '#1565c0',
    '#64b5f6',
    '#1976d2',
    '#90caf9',
    '#1e88e5',
    '#bbdefb',
    '#2196f3',
    '#e3f2fd',
    '#0a3d91',
    '#42a5f5',
    '#1565c0',
    '#64b5f6',
    '#1976d2'
  ],
  name: 'Blue',
  description: 'Alternating blue shades - dark and light pairs'
};

// Green Theme - Alternating green shades
const greenTheme: ChartColorTheme = {
  colors: [
    '#1b5e20',
    '#66bb6a',
    '#2e7d32',
    '#81c784',
    '#388e3c',
    '#a5d6a7',
    '#43a047',
    '#c8e6c9',
    '#4caf50',
    '#e8f5e8',
    '#0d4f1c',
    '#66bb6a',
    '#2e7d32',
    '#81c784',
    '#388e3c'
  ],
  name: 'Green',
  description: 'Alternating green shades - dark and light pairs'
};

// Purple Theme - Alternating purple shades
const purpleTheme: ChartColorTheme = {
  colors: [
    '#4a148c',
    '#ab47bc',
    '#6a1b9a',
    '#ba68c8',
    '#7b1fa2',
    '#ce93d8',
    '#8e24aa',
    '#e1bee7',
    '#9c27b0',
    '#f3e5f5',
    '#3d0e7a',
    '#ab47bc',
    '#6a1b9a',
    '#ba68c8',
    '#7b1fa2'
  ],
  name: 'Purple',
  description: 'Alternating purple shades - dark and light pairs'
};

// Orange Theme - Alternating orange shades
const orangeTheme: ChartColorTheme = {
  colors: [
    '#e65100',
    '#ffcc02',
    '#f57c00',
    '#ffd54f',
    '#ff9800',
    '#ffecb3',
    '#ffa726',
    '#fff3e0',
    '#ffb74d',
    '#fff8e1',
    '#bf360c',
    '#ffcc02',
    '#f57c00',
    '#ffd54f',
    '#ff9800'
  ],
  name: 'Orange',
  description: 'Alternating orange shades - dark and light pairs'
};

// Red Theme - Alternating red shades
const redTheme: ChartColorTheme = {
  colors: [
    '#b71c1c',
    '#ef5350',
    '#c62828',
    '#e57373',
    '#d32f2f',
    '#ef9a9a',
    '#e53935',
    '#ffcdd2',
    '#f44336',
    '#ffebee',
    '#8e0000',
    '#ef5350',
    '#c62828',
    '#e57373',
    '#d32f2f'
  ],
  name: 'Red',
  description: 'Alternating red shades - dark and light pairs'
};

// Teal Theme - Alternating teal shades
const tealTheme: ChartColorTheme = {
  colors: [
    '#004d40',
    '#26a69a',
    '#00695c',
    '#4db6ac',
    '#00796b',
    '#80cbc4',
    '#00897b',
    '#b2dfdb',
    '#009688',
    '#e0f2f1',
    '#00251a',
    '#26a69a',
    '#00695c',
    '#4db6ac',
    '#00796b'
  ],
  name: 'Teal',
  description: 'Alternating teal shades - dark and light pairs'
};

// Indigo Theme - Alternating indigo shades
const indigoTheme: ChartColorTheme = {
  colors: [
    '#1a237e',
    '#5c6bc0',
    '#283593',
    '#7986cb',
    '#303f9f',
    '#9fa8da',
    '#3949ab',
    '#c5cae9',
    '#3f51b5',
    '#e8eaf6',
    '#0d1442',
    '#5c6bc0',
    '#283593',
    '#7986cb',
    '#303f9f'
  ],
  name: 'Indigo',
  description: 'Alternating indigo shades - dark and light pairs'
};

// Pink Theme - Alternating pink shades
const pinkTheme: ChartColorTheme = {
  colors: [
    '#880e4f',
    '#ec407a',
    '#ad1457',
    '#f06292',
    '#c2185b',
    '#f48fb1',
    '#d81b60',
    '#f8bbd9',
    '#e91e63',
    '#fce4ec',
    '#560027',
    '#ec407a',
    '#ad1457',
    '#f06292',
    '#c2185b'
  ],
  name: 'Pink',
  description: 'Alternating pink shades - dark and light pairs'
};

// Cyan Theme - Alternating cyan shades
const cyanTheme: ChartColorTheme = {
  colors: [
    '#006064',
    '#26c6da',
    '#00838f',
    '#4dd0e1',
    '#0097a7',
    '#80deea',
    '#00acc1',
    '#b2ebf2',
    '#00bcd4',
    '#e0f7fa',
    '#00363a',
    '#26c6da',
    '#00838f',
    '#4dd0e1',
    '#0097a7'
  ],
  name: 'Cyan',
  description: 'Alternating cyan shades - dark and light pairs'
};

// Brown Theme - Alternating brown shades
const brownTheme: ChartColorTheme = {
  colors: [
    '#3e2723',
    '#8d6e63',
    '#4e342e',
    '#a1887f',
    '#5d4037',
    '#bcaaa4',
    '#6d4c41',
    '#d7ccc8',
    '#795548',
    '#efebe9',
    '#1b0000',
    '#8d6e63',
    '#4e342e',
    '#a1887f',
    '#5d4037'
  ],
  name: 'Brown',
  description: 'Alternating brown shades - dark and light pairs'
};

// Blue to Green Rainbow Theme - Alternating blue-green shades
const blueGreenTheme: ChartColorTheme = {
  colors: [
    '#0d47a1',
    '#00bcd4',
    '#1565c0',
    '#00acc1',
    '#1976d2',
    '#0097a7',
    '#1e88e5',
    '#00838f',
    '#2196f3',
    '#006064',
    '#004d40',
    '#00bcd4',
    '#00695c',
    '#00acc1',
    '#00796b'
  ],
  name: 'Blue to Green',
  description: 'Alternating blue to green shades - smooth transition'
};

// Rainbow Light Theme - Alternating pastel colors
const rainbowLightTheme: ChartColorTheme = {
  colors: [
    '#ffebee',
    '#e8f5e8',
    '#f3e5f5',
    '#fff3e0',
    '#e8eaf6',
    '#fff8e1',
    '#e3f2fd',
    '#fce4ec',
    '#e0f2f1',
    '#f1f8e9',
    '#e0f7fa',
    '#e8f5e8',
    '#e8eaf6',
    '#fff3e0',
    '#f3e5f5'
  ],
  name: 'Rainbow Light',
  description: 'Alternating soft pastel rainbow colors'
};

// Rainbow Dark Theme - Alternating vibrant colors
const rainbowDarkTheme: ChartColorTheme = {
  colors: [
    '#b71c1c',
    '#1b5e20',
    '#4a148c',
    '#e65100',
    '#1a237e',
    '#f57c00',
    '#0d47a1',
    '#880e4f',
    '#004d40',
    '#2e7d32',
    '#006064',
    '#1b5e20',
    '#1a237e',
    '#e65100',
    '#4a148c'
  ],
  name: 'Rainbow Dark',
  description: 'Alternating vibrant dark rainbow colors'
};

// Default theme (uses blue theme)
const defaultTheme: ChartColorTheme = blueTheme;

// Chart color theme selector
export const getChartColors = (themeName: string = 'default'): ChartColorTheme => {
  switch (themeName) {
    case 'blue':
      return blueTheme;
    case 'green':
      return greenTheme;
    case 'purple':
      return purpleTheme;
    case 'orange':
      return orangeTheme;
    case 'red':
      return redTheme;
    case 'teal':
      return tealTheme;
    case 'indigo':
      return indigoTheme;
    case 'pink':
      return pinkTheme;
    case 'cyan':
      return cyanTheme;
    case 'brown':
      return brownTheme;
    case 'blue-green':
      return blueGreenTheme;
    case 'rainbow-light':
      return rainbowLightTheme;
    case 'rainbow-dark':
      return rainbowDarkTheme;
    case 'theme1':
      return blueTheme; // Map theme1 to blue
    case 'theme2':
      return purpleTheme; // Map theme2 to purple
    case 'theme3':
      return indigoTheme; // Map theme3 to indigo
    case 'theme4':
      return tealTheme; // Map theme4 to teal
    case 'theme5':
      return orangeTheme; // Map theme5 to orange
    case 'theme6':
      return greenTheme; // Map theme6 to green
    case 'allyvia':
      return blueTheme; // Map allyvia to blue
    case 'default':
    default:
      return defaultTheme;
  }
};

// Helper function to get color array from theme
export const getChartColorArray = (themeName: string = 'default'): string[] => {
  const theme = getChartColors(themeName);
  return theme.colors;
};

// Helper function to get specific number of colors from theme
export const getChartColorsCount = (themeName: string = 'default', count: number = 5): string[] => {
  const colors = getChartColorArray(themeName);
  return colors.slice(0, count);
};

// Predefined color combinations for specific chart types
export const getChartTypeColors = (
  themeName: string = 'default',
  chartType: 'pipeline' | 'forecast' | 'conversion' | 'sources' | 'activities' | 'heatmap' | 'reps'
): string[] => {
  const colors = getChartColorArray(themeName);

  switch (chartType) {
    case 'pipeline':
      return [colors[0], colors[1]]; // First 2 colors
    case 'forecast':
      return [colors[2], colors[3]]; // Next 2 colors
    case 'conversion':
      return [colors[0], colors[1], colors[2]]; // First 3 colors
    case 'sources':
      return [colors[0], colors[1], colors[2], colors[3], colors[4]]; // First 5 colors
    case 'activities':
      return [colors[0], colors[1], colors[2], colors[3], colors[4], colors[5]]; // First 6 colors
    case 'heatmap':
      return [colors[0], colors[1], colors[2]]; // First 3 colors
    case 'reps':
      return [colors[0], colors[1], colors[2]]; // First 3 colors
    default:
      return [colors[0], colors[1]]; // Default to first 2 colors
  }
};

// Get all available theme names
export const getAvailableThemes = (): string[] => {
  return [
    'default',
    'blue',
    'green',
    'purple',
    'orange',
    'red',
    'teal',
    'indigo',
    'pink',
    'cyan',
    'brown',
    'blue-green',
    'rainbow-light',
    'rainbow-dark',
    'theme1',
    'theme2',
    'theme3',
    'theme4',
    'theme5',
    'theme6',
    'allyvia'
  ];
};

// Get theme info
export const getThemeInfo = (themeName: string = 'default'): { name: string; description: string; colors: string[] } => {
  const theme = getChartColors(themeName);
  return {
    name: theme.name,
    description: theme.description,
    colors: theme.colors
  };
};

// Export individual themes for direct access
export {
  defaultTheme,
  blueTheme,
  greenTheme,
  purpleTheme,
  orangeTheme,
  redTheme,
  tealTheme,
  indigoTheme,
  pinkTheme,
  cyanTheme,
  brownTheme,
  blueGreenTheme,
  rainbowLightTheme,
  rainbowDarkTheme
};
