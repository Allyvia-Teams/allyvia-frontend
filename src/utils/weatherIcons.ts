/**
 * Weather condition to icon mapping
 * Matches backend WEATHER_CONDITION_MAP in weather_workflow.py
 *
 * Backend conditions:
 * - Clear sky
 * - Partly cloudy
 * - Overcast
 * - Foggy
 * - Drizzle
 * - Freezing rain
 * - Rainy
 * - Heavy rain
 * - Snowing
 * - Heavy snow
 * - Stormy
 */

export const WEATHER_ICON_MAP: Record<string, string> = {
  // Clear/Clear sky
  'Clear sky': '☀️',
  Clear: '☀️',

  // Partly cloudy
  'Partly cloudy': '⛅',
  'Partly Cloudy': '⛅',

  // Overcast
  Overcast: '☁️',

  // Fog
  Foggy: '🌫️',
  Fog: '🌫️',

  // Drizzle
  Drizzle: '🌦️',
  'Light drizzle': '🌦️',
  'Moderate drizzle': '🌦️',
  'Dense drizzle': '🌦️',

  // Freezing rain
  'Freezing rain': '🌨️',
  'Freezing drizzle': '🌨️',

  // Rain
  Rainy: '🌧️',
  Rain: '🌧️',
  'Heavy rain': '🌧️',
  'Light rain': '🌧️',
  'Slight rain': '🌧️',
  'Moderate rain': '🌧️',

  // Rain showers
  'Rain showers': '🌧️',
  'Slight rain showers': '🌧️',
  'Moderate rain showers': '🌧️',
  'Violent rain showers': '🌧️',

  // Snow
  Snowing: '❄️',
  Snow: '❄️',
  'Heavy snow': '❄️',
  'Slight snow fall': '❄️',
  'Moderate snow fall': '❄️',
  'Heavy snow fall': '❄️',
  'Snow grains': '❄️',
  'Slight snow showers': '❄️',
  'Heavy snow showers': '❄️',

  // Thunderstorm
  Stormy: '⛈️',
  Thunderstorm: '⛈️',
  'Thunderstorm with slight hail': '⛈️',
  'Thunderstorm with heavy hail': '⛈️',

  // Default fallback
  Unknown: '⛅'
};

/**
 * Get weather icon for a given weather condition
 * @param condition Weather condition string (e.g., "Clear sky", "Rainy", "Heavy rain")
 * @returns Weather icon emoji
 */
export function getWeatherIcon(condition: string | undefined | null): string {
  if (!condition) {
    return WEATHER_ICON_MAP['Unknown'];
  }

  // Direct match first (case-insensitive)
  const normalizedCondition = condition.trim();
  const directMatch = WEATHER_ICON_MAP[normalizedCondition];
  if (directMatch) {
    return directMatch;
  }

  // Fallback: case-insensitive search
  const lowerCondition = normalizedCondition.toLowerCase();
  for (const [key, icon] of Object.entries(WEATHER_ICON_MAP)) {
    if (key.toLowerCase() === lowerCondition) {
      return icon;
    }
  }

  // Fallback: partial match (for descriptions that might include condition)
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
    return WEATHER_ICON_MAP['Clear sky'];
  }
  if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) {
    return WEATHER_ICON_MAP['Stormy'];
  }
  if (lowerCondition.includes('snow')) {
    return WEATHER_ICON_MAP['Snowing'];
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
    if (lowerCondition.includes('heavy')) {
      return WEATHER_ICON_MAP['Heavy rain'];
    }
    return WEATHER_ICON_MAP['Rainy'];
  }
  if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
    return WEATHER_ICON_MAP['Foggy'];
  }
  if (lowerCondition.includes('overcast') || lowerCondition.includes('cloud')) {
    if (lowerCondition.includes('partly') || lowerCondition.includes('partial')) {
      return WEATHER_ICON_MAP['Partly cloudy'];
    }
    return WEATHER_ICON_MAP['Overcast'];
  }

  // Default fallback
  return WEATHER_ICON_MAP['Unknown'];
}
