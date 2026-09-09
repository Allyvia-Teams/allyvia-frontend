import React from 'react';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useDispatch } from 'react-redux';
import { fetchInventoryItemsTreeMap, fetchInventoryOverview } from 'store/slices/analytics';
import AnalyticsWidgetGrid from '../registry/AnalyticsWidgetGrid';

interface InventoryAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ dateRange, isLoading }) => {
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(fetchInventoryOverview(undefined) as any);
    dispatch(fetchInventoryItemsTreeMap(undefined) as any);
  }, [dispatch, dateRange?.start, dateRange?.end]);

  return <AnalyticsWidgetGrid tab="inventory" dateRange={dateRange} isLoading={isLoading} />;
};

export default InventoryAnalytics;
