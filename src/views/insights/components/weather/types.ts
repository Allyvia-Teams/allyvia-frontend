/**
 * Weather Insights Types
 * Re-exports weather-related types from the main analytics types file
 * for easier imports within weather components
 */

export type {
  WeatherInsight,
  WeatherLocation,
  WeatherInfo,
  DailyInsight,
  HourlyBlock,
  HourlyRecommendations,
  CriticalAlert,
  ConfidenceScore,
  ActionPriority,
  WeekPriority
} from 'types/analytics';
