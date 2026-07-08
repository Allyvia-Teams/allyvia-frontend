import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';

export const getDateRangeFromRange = (range: DashboardRange): { startDate: string; endDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date;
  let end: Date = new Date(today);

  switch (range) {
    case 'today':
      start = new Date(today);
      end = new Date(today);
      break;
    case '7d':
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      break;
    case '30d':
      start = new Date(today);
      start.setDate(today.getDate() - 29);
      break;
    case 'mtd':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today);
      break;
    default:
      start = new Date(today);
      end = new Date(today);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

export const getEfficiencyDaysFromRange = (range: DashboardRange): number => {
  const { startDate, endDate } = getDateRangeFromRange(range);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
};
