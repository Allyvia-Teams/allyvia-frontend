import React from 'react';
import { SavingsWidget } from 'views/dashboard/SavingsWidget';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

/**
 * Registry adapter for the dashboard SavingsWidget.
 * Does not duplicate ROI / gate logic — renders the existing card as-is.
 */
const SavingsWidgetRegistryEntry: React.FC<AnalyticsWidgetProps> = () => <SavingsWidget />;

export default SavingsWidgetRegistryEntry;
