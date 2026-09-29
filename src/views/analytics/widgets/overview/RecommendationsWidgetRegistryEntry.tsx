import React from 'react';
import { RecommendationCard } from 'views/dashboard/RecommendationCard';
import { useRecommendations } from 'views/dashboard/useRecommendations';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

/**
 * Registry adapter for dashboard RecommendationCard.
 * Owns the useRecommendations() call the dashboard page normally provides.
 */
const RecommendationsWidgetRegistryEntry: React.FC<AnalyticsWidgetProps> = () => {
  const state = useRecommendations();
  return <RecommendationCard state={state} />;
};

export default RecommendationsWidgetRegistryEntry;
