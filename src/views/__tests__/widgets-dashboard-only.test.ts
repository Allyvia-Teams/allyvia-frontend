/**
 * U8 (UI cleanup, 2026-11-06): KPI tiles, stat strips and rail cards appear on
 * the Dashboard and nowhere else. Every other page starts with its content
 * under its PageHeader.
 *
 * This reads the source rather than rendering, like dashboardAudit.test.ts: the
 * rule is about which components a page is built from, and a render test of
 * one page cannot see a widget creeping onto another.
 *
 * Covered: the frame's KpiTile, KpiRow, StatsStrip and RailCard, and the
 * Dashboard's own widgets imported from outside views/dashboard. NOT covered:
 * the older AllyviaStats / AllyviaSubcard tiles (the owner scoped U8 to the
 * frame widgets; the pages still using them are a logged follow-up), and
 * anything under src/ui-component, which this scan does not walk.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..');
const VIEWS = join(SRC, 'views');

/** Pages that keep a widget on purpose, by path under src/views, each with its reason. */
const EXCEPTIONS: Record<string, string> = {
  'analytics/index.tsx':
    "Analytics leads with its four money figures (Sales, Money out, Left over, Cash on hand): the owner approved that layout in the analytics redesign mockup, 2026-11-11.",
  'inner-circle/ThisWeek.tsx': "Inner Circle This week's four tiles are that page's own summary (decided in the IC redesign).",
  'inventory/plan/components/Memo.tsx':
    "The buy-plan memo's totals strip is the memo's content: each figure is a chunk she can send to the chat, also on the share link (owner, U8).",
  'inventory/workspace/TodayTab.tsx':
    "Today's five-tile health strip is the inventory tab cleanup's spec (§5.4; §5.9 absorbs the U8 follow-up by moving the inventory tiles to KpiTile as their views are re-homed)."
};

const FRAME_BARREL = 'ui-component/frame';
const FRAME_WIDGETS = new Set(['KpiTile', 'KpiRow', 'StatsStrip', 'RailCard']);
/** Deep frame modules: the default export's widget name, and which named exports are widgets. */
const FRAME_DEEP: Record<string, { default?: string; named: string[] }> = {
  'ui-component/frame/KpiTile': { default: 'KpiTile', named: ['KpiRow'] },
  'ui-component/frame/Panel': { named: ['StatsStrip'] },
  'ui-component/frame/RailCard': { default: 'RailCard', named: [] }
};
const DASHBOARD_WIDGETS = new Set(
  [
    'SavingsWidget',
    'AttentionCard',
    'QuickBooks/QBWidget',
    'QuickBooks/QuickBooksSection',
    'EmployeeSection',
    'InventorySection',
    'FeedbackBanner'
  ].map((name) => `views/dashboard/${name}`)
);

const STATEMENT = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*['"]([^'"]+)['"]/g;

/** A module specifier as a path under src/, without extension or /index. */
function resolveSpecifier(spec: string, fileRel: string): string {
  const joined = spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(fileRel), spec)) : spec;
  return joined.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '');
}

interface Bindings {
  namespace: boolean;
  defaultName: string | null;
  named: string[];
}

function parseBindings(clause: string): Bindings {
  const text = clause.trim();
  if (text === '*' || text.startsWith('* ')) return { namespace: true, defaultName: null, named: [] };
  const brace = text.indexOf('{');
  const head = (brace === -1 ? text : text.slice(0, brace)).replace(/,\s*$/, '').trim();
  const named =
    brace === -1
      ? []
      : text
          .slice(brace + 1, text.lastIndexOf('}'))
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part && !part.startsWith('type '))
          .map((part) => part.split(/\s+as\s+/)[0].trim());
  return { namespace: false, defaultName: head && !head.startsWith('*') ? head : null, named };
}

/** Every widget a source file pulls in, as "<module>: <name>". `fileRel` is the path under src/. */
function widgetImports(source: string, fileRel: string): string[] {
  const found: string[] = [];
  const inDashboard = fileRel.startsWith('views/dashboard/');
  for (const match of source.matchAll(STATEMENT)) {
    const [, keyword, typeOnly, clause, spec] = match;
    if (typeOnly) continue;
    const target = resolveSpecifier(spec, fileRel);
    const bindings = parseBindings(clause);
    const isReexportAll = keyword === 'export' && bindings.namespace;

    if (target === FRAME_BARREL) {
      if (bindings.namespace || isReexportAll) found.push(`${target}: *`);
      bindings.named.filter((name) => FRAME_WIDGETS.has(name)).forEach((name) => found.push(`${target}: ${name}`));
    } else if (FRAME_DEEP[target]) {
      const deep = FRAME_DEEP[target];
      if (bindings.namespace) found.push(`${target}: *`);
      if (bindings.defaultName && deep.default) found.push(`${target}: ${deep.default}`);
      bindings.named.filter((name) => deep.named.includes(name)).forEach((name) => found.push(`${target}: ${name}`));
    } else if (!inDashboard && DASHBOARD_WIDGETS.has(target)) {
      found.push(`${target}: ${bindings.namespace ? '*' : [bindings.defaultName, ...bindings.named].filter(Boolean).join(', ')}`);
    }
  }
  return found;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Files under src/views that pull in a widget, keyed by path under src/views. */
function scan({ skipDashboard, skipExceptions }: { skipDashboard: boolean; skipExceptions: boolean }): Record<string, string[]> {
  const offenders: Record<string, string[]> = {};
  for (const file of sourceFiles(VIEWS)) {
    const underViews = relative(VIEWS, file).split(sep).join('/');
    if (skipDashboard && underViews.startsWith('dashboard/')) continue;
    if (skipExceptions && underViews in EXCEPTIONS) continue;
    const found = widgetImports(readFileSync(file, 'utf8'), `views/${underViews}`);
    if (found.length) offenders[underViews] = found;
  }
  return offenders;
}

describe('U8: widgets stay on the Dashboard', () => {
  it('no page outside the Dashboard imports a tile, stat strip, rail card or Dashboard widget', () => {
    expect(scan({ skipDashboard: true, skipExceptions: true })).toEqual({});
  });

  it('finds the Dashboard’s own widgets when the Dashboard is not excluded (vacuity guard)', () => {
    const offenders = scan({ skipDashboard: false, skipExceptions: true });
    expect(Object.keys(offenders)).toEqual(
      expect.arrayContaining([
        'dashboard/AttentionCard.tsx',
        'dashboard/SavingsWidget.tsx',
        'dashboard/QuickBooks/QuickBooksSection.tsx',
        'dashboard/EmployeeSection.tsx'
      ])
    );
  });

  it.each(Object.keys(EXCEPTIONS))('the exception %s still uses a widget (drop it from the list when it stops)', (path) => {
    expect(scan({ skipDashboard: true, skipExceptions: false })[path]).toBeDefined();
  });
});

describe('U8 scanner: the import shapes it reads', () => {
  const page = 'views/finance/tabs/Overview.tsx';

  it.each([
    ["import { RailCard } from 'ui-component/frame';", 'ui-component/frame: RailCard'],
    ["import { Panel, KpiRow } from 'ui-component/frame';", 'ui-component/frame: KpiRow'],
    ["import {\n  StatsStrip,\n  type StatCell\n} from 'ui-component/frame';", 'ui-component/frame: StatsStrip'],
    ["import { RailCard as Card } from 'ui-component/frame';", 'ui-component/frame: RailCard'],
    ["import * as Frame from 'ui-component/frame';", 'ui-component/frame: *'],
    ["import KpiTile from 'ui-component/frame/KpiTile';", 'ui-component/frame/KpiTile: KpiTile'],
    ["import Rail from 'ui-component/frame/RailCard';", 'ui-component/frame/RailCard: RailCard'],
    ["import { StatsStrip } from 'ui-component/frame/Panel';", 'ui-component/frame/Panel: StatsStrip'],
    ["import { RailCard } from '../../../ui-component/frame';", 'ui-component/frame: RailCard'],
    ["import { RailCard } from '../../../ui-component/frame/index';", 'ui-component/frame: RailCard'],
    ["export { RailCard } from 'ui-component/frame';", 'ui-component/frame: RailCard'],
    ["export * from 'ui-component/frame';", 'ui-component/frame: *'],
    ["import { SavingsWidget } from 'views/dashboard/SavingsWidget';", 'views/dashboard/SavingsWidget: SavingsWidget'],
    ["import AttentionCard from '../../dashboard/AttentionCard';", 'views/dashboard/AttentionCard: AttentionCard']
  ])('flags %s', (statement, expected) => {
    expect(widgetImports(statement, page)).toEqual([expected]);
  });

  it.each([
    "import type { StatCell, RailRow } from 'ui-component/frame';",
    "import { Panel, PanelMessage, type RailRow } from 'ui-component/frame';",
    "import { PageHeader } from 'ui-component/frame';",
    "import { useToneColor } from 'ui-component/frame/KpiTile';",
    "import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';",
    "import { RecommendationCard } from 'views/dashboard/RecommendationCard';"
  ])('ignores %s', (statement) => {
    expect(widgetImports(statement, page)).toEqual([]);
  });

  it('lets the Dashboard import its own widgets', () => {
    expect(widgetImports("import { SavingsWidget } from './SavingsWidget';", 'views/dashboard/index.tsx')).toEqual([]);
  });
});
