// "See the numbers" (Inventory › Plan, buy planner B9; design §10): a decision trace as rows she opens level by
// level. One GET returns every node, so opening is local state. The words beside a node are its own label, its
// value with its unit and range as the backend wrote it (decimal strings), and the evidence status in words.

import type { Trace, TraceNode, TraceValue } from 'api/agentTrace.api';

export interface TraceRow {
  key: string;
  label: string;
  depth: number;
  breadcrumbs: string[];
  hasChildren: boolean;
  open: boolean;
  valueText: string;
  statusText: string;
  node: TraceNode;
}

const childrenOf = (trace: Trace, key: string, path: Set<string>) =>
  (trace.nodes[key]?.children || []).filter((child) => trace.nodes[child] && !path.has(child));

/** The rows she sees: the root always open, any other node open when `expanded` holds it. Root-first. */
export const flatten = (trace: Trace, expanded: Set<string>): TraceRow[] => {
  const rows: TraceRow[] = [];
  const visit = (key: string, depth: number, crumbs: string[], path: Set<string>) => {
    const node = trace.nodes[key];
    if (!node) return;
    const here = new Set(path).add(key);
    const kids = childrenOf(trace, key, here);
    const open = depth === 0 || expanded.has(key);
    rows.push({
      key,
      label: node.label,
      depth,
      breadcrumbs: crumbs,
      hasChildren: kids.length > 0,
      open,
      valueText: valueText(node.value),
      statusText: statusText(node.evidence?.status),
      node
    });
    if (open) kids.forEach((child) => visit(child, depth + 1, [...crumbs, node.label], here));
  };
  visit(trace.root, 0, [], new Set());
  return rows;
};

/** The keys to open to reach `key` (root first, not the key itself); [] for the root, null when absent. */
export const pathTo = (trace: Trace, key: string): string[] | null => {
  const walk = (at: string, path: string[]): string[] | null => {
    if (at === key) return path;
    for (const child of childrenOf(trace, at, new Set([...path, at]))) {
      const found = walk(child, [...path, at]);
      if (found) return found;
    }
    return null;
  };
  return trace.nodes[trace.root] ? walk(trace.root, []) : null;
};

/** A decimal string grouped with commas and printed as written (never re-rounded); money keeps at least cents,
 * other values drop trailing zeros ("0.8000" reads 0.8). */
const number = (text: string, money: boolean) => {
  if (!/^-?\d+(\.\d+)?$/.test(text.trim())) return text;
  const [whole, frac = ''] = text.trim().split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = (sign ? whole.slice(1) : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const tail = money ? frac.padEnd(2, '0') : frac.replace(/0+$/, '');
  return `${sign}${digits}${tail ? `.${tail}` : ''}`;
};

const plural = (word: string, amount: string) => (Number(amount) === 1 ? word : `${word}s`);

/** "40 (34–49) units", "$3,768.00", "0.8", "58.5%", "12 days"; '' with no value, "—" with no amount. */
export const valueText = (value: TraceValue | null | undefined): string => {
  if (!value) return '';
  if (value.amount === null || value.amount === undefined) return '—';
  const money = value.unit === 'usd';
  const fmt = (text: string) => (money ? `$${number(text, true)}` : number(text, false));
  const range =
    value.low !== null && value.high !== null && value.low !== undefined && value.high !== undefined
      ? ` (${fmt(value.low)}–${fmt(value.high)})`
      : '';
  const head = `${fmt(value.amount)}${range}`;
  switch (value.unit) {
    case 'usd':
    case 'ratio':
    case 'count':
      return head;
    case 'pct':
      return `${head}%`;
    case 'units':
      return `${head} ${plural('unit', value.amount)}`;
    case 'days':
      return `${head} ${plural('day', value.amount)}`;
    case 'weeks':
      return `${head} ${plural('week', value.amount)}`;
    case 'units_per_day':
      return `${head} a day`;
    default:
      return value.unit ? `${head} ${value.unit}` : head;
  }
};

export const statusText = (status: string | null | undefined): string => (status ? status.replace(/_/g, ' ') : '');

/** A node's series as chart points, or null when it carries none or anything else. */
export const seriesOf = (node: TraceNode): { x: number | string; y: number }[] | null => {
  const series = node.evidence?.series;
  if (!Array.isArray(series) || series.length === 0) return null;
  const points: { x: number | string; y: number }[] = [];
  for (const point of series) {
    if (typeof point !== 'object' || point === null) return null;
    const { x, y } = point as { x?: unknown; y?: unknown };
    const yNumber = typeof y === 'number' ? y : typeof y === 'string' && y.trim() !== '' ? Number(y) : NaN;
    if ((typeof x !== 'number' && typeof x !== 'string') || !Number.isFinite(yNumber)) return null;
    points.push({ x, y: yNumber });
  }
  return points;
};
