/**
 * Weather Insights Constants
 * Weather-specific constants and configuration
 */

// Valid forecast days range
export const MIN_FORECAST_DAYS = 1;
export const MAX_FORECAST_DAYS = 14;
export const DEFAULT_FORECAST_DAYS = 7;

// Urgency level mappings
export const URGENCY_LEVELS = {
  critical: 'URGENT' as const,
  high: 'WARNING' as const,
  medium: 'INFO' as const,
  low: 'INFO' as const
} as const;

// Operational impact levels
export type OperationalImpact = 'low' | 'medium' | 'high';

// Alert urgency levels
export type AlertUrgency = 'URGENT' | 'WARNING' | 'INFO';

// Action priority levels
export type ActionPriorityLevel = 'critical' | 'high' | 'medium' | 'low';
