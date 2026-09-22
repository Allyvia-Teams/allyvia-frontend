// project imports
import KpiTile, { type KpiTileProps } from 'ui-component/frame/KpiTile';

// ===========================|| DASHBOARD DEFAULT - QBWidget ||=========================== //
// KPI tile per design handoff 1.2. The former `gold` variant is gone: profit is
// not decorated, it is just a tile. Kept as a named wrapper so the KPI row
// reads the same as before; all styling lives in KpiTile.

interface QBWidgetProps {
  isLoading: boolean;
  title: string;
  value: string;
  /** Formatted delta ("+8.4%"); omitted when the payload has no comparison. */
  sub?: string;
  basis?: KpiTileProps['basis'];
  tone?: KpiTileProps['tone'];
}

export default function QBWidget({ isLoading, title, value, sub, basis, tone }: QBWidgetProps) {
  return <KpiTile label={title} value={value} delta={sub} basis={basis} tone={tone} loading={isLoading} />;
}
