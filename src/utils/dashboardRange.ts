import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end)
  };
};

export const getEfficiencyDaysFromRange = (range: DashboardRange): number => {
  const { startDate, endDate } = getDateRangeFromRange(range);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
};
