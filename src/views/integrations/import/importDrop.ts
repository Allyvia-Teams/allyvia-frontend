// The Import data screen's pure seam (context-graph P1b).
//
// Everything the screen decides lives here so it can be tested without a DOM:
// the table's rows, the lane counts, the sentences that say why Approve is
// off, what a file may be reclassified as, and how often to poll. Approve
// itself is the SERVER's answer (`can_approve`), never recomputed here — the
// onboarding lane's readiness is a company-wide fact this screen cannot see.

import type { BulkDrop, DateOrderChoice, DropFile, DropLane, ReclassifyBody } from 'api/importDrops.api';
import type { InnerCircleImportSummary } from 'api/posIntegrations.api';

// 'choose': the drop waits for the merchant to say what the file holds.
export type RowTone = 'choose' | 'direct' | 'onboarding' | 'refused';

export interface DropRow {
  id: string;
  displayName: string;
  containerName: string;
  lane: DropLane;
  tone: RowTone;
  laneLabel: string;
  entityLabel: string;
  statusLabel: string;
  confidenceLabel: string;
  reason: string;
  mappingLink: string | null;
  file: DropFile;
}

export interface ReclassifyOption {
  label: string;
  lane?: DropLane;
  entity?: string;
  /** Leave the file out of this drop (it is refused; the rest proceeds). */
  exclude?: boolean;
}

/** Always last: a file that cannot import (or will never settle) never holds the drop. */
export const LEAVE_OUT: ReclassifyOption = { label: 'Leave this file out', exclude: true };

/** The direct lane's entities, in the order the CSV importer commits them. */
export const DIRECT_ENTITIES = ['customer', 'product', 'inventory_level', 'order'] as const;

const ENTITY_LABELS: Record<string, string> = {
  customer: 'Customers',
  product: 'Products',
  inventory_level: 'Stock levels',
  order: 'Orders',
  vendor: 'Vendors',
  employee: 'Employees',
  expense: 'Expenses'
};

const STATUS_LABELS: Record<string, string> = {
  classified: 'Ready',
  parked: 'Waiting for onboarding',
  sent: 'In onboarding',
  staged: 'Staged',
  committed: 'Imported',
  refused: 'Refused',
  failed: 'Failed',
  needs_entity: 'Needs your answer'
};

const TONE_ORDER: Record<RowTone, number> = { choose: 0, direct: 1, onboarding: 2, refused: 3 };

export const FAST_POLL_MS = 2500;
export const SLOW_POLL_MS = 10000;

export function mappingLink(sourceId: string): string {
  return `/settings?tab=onboarding&step=4&source=${encodeURIComponent(sourceId)}`;
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? (entity ? entity : '—');
}

/**
 * False only when the server says the onboarding (BigQuery) import is switched
 * off. A payload from a server that predates the field counts as available.
 */
export function onboardingAvailable(drop: BulkDrop): boolean {
  return drop.onboarding_available !== false;
}

/**
 * The drop waits on the merchant for this file: what it holds and, when
 * `needs_date_order` is set, how its dates read. Only this status asks; the
 * date flag on its own is never treated as a question.
 */
export function needsAnswer(file: DropFile): boolean {
  return file.status === 'needs_entity';
}

function toneOf(file: DropFile): RowTone {
  if (file.status === 'refused') return 'refused';
  if (needsAnswer(file)) return 'choose';
  return file.lane === 'integrations' ? 'direct' : 'onboarding';
}

function statusLabel(file: DropFile): string {
  if (file.status === 'sent' && file.onboarding?.needs_mapping) return 'Needs mapping';
  return STATUS_LABELS[file.status] ?? file.status;
}

export function rowsFor(drop: BulkDrop): DropRow[] {
  return drop.files
    .map((file) => {
      const tone = toneOf(file);
      const laneLabel =
        tone === 'refused'
          ? 'Not imported'
          : tone === 'choose'
            ? 'Waiting for you'
            : file.lane === 'integrations'
              ? 'Direct import'
              : 'Onboarding';
      return {
        id: file.id,
        displayName: file.member || file.name,
        containerName: file.member ? file.name : '',
        lane: file.lane,
        tone,
        laneLabel,
        entityLabel: entityLabel(file.entity),
        statusLabel: tone === 'choose' ? STATUS_LABELS.needs_entity : statusLabel(file),
        confidenceLabel: file.confidence == null ? '—' : `${Math.round(file.confidence * 100)}%`,
        reason: file.reason,
        mappingLink: file.onboarding?.needs_mapping && onboardingAvailable(drop) ? mappingLink(file.onboarding.source_id) : null,
        file
      };
    })
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.displayName.localeCompare(b.displayName));
}

export function laneCounts(drop: BulkDrop): Record<RowTone, number> {
  const counts = { choose: 0, direct: 0, onboarding: 0, refused: 0 };
  drop.files.forEach((file) => {
    counts[toneOf(file)] += 1;
  });
  return counts;
}

export function canApprove(drop: BulkDrop | undefined): boolean {
  return drop?.can_approve === true;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Why Approve is off, in the merchant's words. Empty when it is on or done. */
export function blockersFor(drop: BulkDrop): string[] {
  if (canApprove(drop) || drop.status === 'completed') return [];
  const sentences: string[] = [];
  if (drop.waiting) sentences.push(drop.waiting);

  const { direct, onboarding, onboarding_reason: onboardingReason } = drop.lane_state;
  if (direct === 'blocked') {
    const count = drop.report.direct?.blocker_count ?? 0;
    sentences.push(`The direct import has ${plural(count, 'blocker', 'blockers')} to resolve in its report below.`);
  } else if (direct === 'waiting' && !drop.waiting) {
    sentences.push('The direct import is still being checked.');
  } else if (direct === 'failed') {
    sentences.push('The direct import failed; see its report below.');
  }

  if (!['none', 'ready', 'imported'].includes(onboarding)) {
    sentences.push(onboardingReason || 'The onboarding lane is not ready yet.');
  }
  const unmapped = drop.files.filter((file) => file.status === 'sent' && file.onboarding?.needs_mapping).length;
  if (unmapped && onboardingAvailable(drop)) {
    sentences.push(`${plural(unmapped, 'file needs its', 'files need their')} columns confirmed in onboarding.`);
  }
  return sentences;
}

/**
 * Why the onboarding lane takes nothing from this drop, when the server says
 * (every onboarding file failed, or onboarding imports are switched off on
 * this server). Not a blocker — the direct import goes ahead without it — so
 * it shows whether or not Approve is on. Null when there is nothing to say.
 */
export function onboardingLaneNote(drop: BulkDrop): string | null {
  // With onboarding switched off there is nothing to explain unless a file
  // still ended up in that lane.
  if (!onboardingAvailable(drop) && !laneCounts(drop).onboarding) return null;
  const { onboarding, onboarding_reason: onboardingReason } = drop.lane_state;
  return onboarding === 'none' && onboardingReason ? onboardingReason : null;
}

/** What a file may be moved to. Nothing once it is in onboarding, refused, or importing. */
export function reclassifyOptions(drop: BulkDrop, file: DropFile): ReclassifyOption[] {
  if (['committing', 'completed'].includes(drop.status)) return [];
  if (file.status === 'sent' || file.status === 'refused') return [];
  // Answered through its own question, not this menu.
  if (needsAnswer(file)) return [];
  const direct: ReclassifyOption[] = DIRECT_ENTITIES.filter((entity) => !(file.lane === 'integrations' && entity === file.entity)).map(
    (entity) => ({ label: `Import as ${ENTITY_LABELS[entity]}`, lane: 'integrations', entity })
  );
  if (file.lane === 'integrations' && onboardingAvailable(drop)) {
    return [...direct, { label: 'Send to onboarding for a person to map', lane: 'onboarding' }, LEAVE_OUT];
  }
  return [...direct, LEAVE_OUT];
}

const STATUS_SENTENCES: Record<BulkDrop['status'], string> = {
  receiving: 'Receiving',
  classified: 'Read — waiting to start',
  staging: 'Checking the files',
  awaiting_approval: 'Ready for your review',
  committing: 'Importing',
  completed: 'Imported',
  failed: 'Failed'
};

/** A drop status in plain words (the recent-drops list, which has no lane detail). */
export function dropStatusLabel(status: BulkDrop['status']): string {
  return STATUS_SENTENCES[status] ?? status;
}

/** The drop's headline: what it is waiting on, not a generic "checking". */
export function statusSentence(drop: BulkDrop): string {
  const { direct, onboarding } = drop.lane_state;
  if (drop.status === 'staging' && ['ready', 'blocked'].includes(direct) && onboarding === 'waiting') {
    return 'Direct import checked — waiting for the onboarding lane';
  }
  return STATUS_SENTENCES[drop.status] ?? drop.status;
}

export function formatDropSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

/** How often to re-read the drop: fast while a run moves, slow while a person maps. */
export function pollDelay(drop: BulkDrop | undefined): number | null {
  if (!drop) return null;
  if (drop.status === 'staging' || drop.status === 'committing') return FAST_POLL_MS;
  const mapping = drop.files.some(
    (file) => file.status === 'sent' && file.onboarding && !['done', 'failed'].includes(file.onboarding.phase)
  );
  return mapping ? SLOW_POLL_MS : null;
}

/** The headline's counts: only the lanes that hold something, and no onboarding lane where it is off. */
export function headlineCounts(drop: BulkDrop): string {
  const counts = laneCounts(drop);
  const parts = [`${counts.direct} to import directly`];
  if (counts.onboarding || onboardingAvailable(drop)) parts.push(`${counts.onboarding} through onboarding`);
  if (counts.refused) parts.push(`${counts.refused} not imported`);
  if (counts.choose) parts.push(`${plural(counts.choose, 'file needs', 'files need')} your answer`);
  return parts.join(' · ');
}

// --- Files the classifier could not place --------------------------------------

/** The choice value that leaves a file out rather than importing it. */
export const LEAVE_OUT_VALUE = 'exclude';

export const DATE_ORDER_CHOICES: { value: DateOrderChoice; label: string }[] = [
  { value: 'mdy', label: 'Month first (03/04 is March 4)' },
  { value: 'dmy', label: 'Day first (03/04 is 3 April)' }
];

export interface EntityQuestion {
  fileId: string;
  displayName: string;
  containerName: string;
  reason: string;
  /** What the file may be imported as, then "Leave this file out". Empty when only the date order is asked. */
  choices: { value: string; label: string }[];
  needsDateOrder: boolean;
  /** The entity a date-order-only answer keeps. */
  currentEntity: string;
}

/** One question per file the drop is waiting on, in the table's order. */
export function entityQuestions(drop: BulkDrop): EntityQuestion[] {
  if (['committing', 'completed'].includes(drop.status)) return [];
  return rowsFor(drop)
    .filter((row) => row.tone === 'choose')
    .map(({ file, displayName, containerName }) => {
      const offered = file.entity_choices ?? [];
      return {
        fileId: file.id,
        displayName,
        containerName,
        reason: file.reason,
        choices: offered.length
          ? [
              ...offered.map((choice) => ({ value: choice.entity, label: choice.label })),
              { value: LEAVE_OUT_VALUE, label: LEAVE_OUT.label }
            ]
          : [],
        needsDateOrder: file.needs_date_order === true,
        currentEntity: file.entity
      };
    });
}

/**
 * The reclassify body for an answer, or null while it is incomplete. Leaving
 * the file out needs nothing else; importing it needs the date order too when
 * the dates read either way.
 */
export function entityAnswer(question: EntityQuestion, choice: string, dateOrder: DateOrderChoice | ''): ReclassifyBody | null {
  if (choice === LEAVE_OUT_VALUE) return { exclude: true };
  const entity = question.choices.length ? choice : question.currentEntity;
  if (!entity) return null;
  if (question.choices.length && !question.choices.some((option) => option.value === choice)) return null;
  if (question.needsDateOrder) {
    if (!dateOrder) return null;
    return { entity, date_order: dateOrder };
  }
  return { entity };
}

/** Whether "Try again" can help: a busy connection or a parked file, not a question only the merchant can answer. */
export function canRetry(drop: BulkDrop): boolean {
  if (drop.files.some((file) => file.status === 'parked')) return true;
  return !!drop.waiting && !laneCounts(drop).choose;
}

// --- Inner Circle after an import ----------------------------------------------

export interface InnerCircleView {
  severity: 'success' | 'info' | 'warning';
  title: string;
  lines: string[];
}

/** What Inner Circle did after this import, in plain sentences. */
export function innerCircleView(summary: InnerCircleImportSummary | null | undefined): InnerCircleView | null {
  if (!summary) return null;
  const lines: string[] = [];
  if (summary.contacts_updated) lines.push(`${plural(summary.contacts_updated, 'customer', 'customers')} updated.`);
  if (summary.duplicates_merged) lines.push(`${plural(summary.duplicates_merged, 'duplicate', 'duplicates')} merged.`);
  if (summary.ladder_created) lines.push('A default ladder was created, since you had none.');
  if (summary.enrolled) lines.push(`${plural(summary.enrolled, 'member', 'members')} enrolled.`);
  const skipped = summary.skipped;
  if (typeof skipped === 'string' && skipped.trim()) lines.push(`Skipped: ${skipped.trim()}`);
  if (typeof skipped === 'number' && skipped > 0) lines.push(`${plural(skipped, 'customer was', 'customers were')} skipped.`);
  if (summary.error) {
    lines.push(summary.error);
    return { severity: 'warning', title: 'Inner Circle setup did not finish', lines };
  }
  if (!lines.length) lines.push('Nothing needed to change.');
  return { severity: typeof skipped === 'string' && skipped.trim() ? 'info' : 'success', title: 'Inner Circle', lines };
}

// --- Templates -------------------------------------------------------------------

export const IMPORT_TEMPLATES = [
  { file: 'products.csv', label: 'Products' },
  { file: 'customers.csv', label: 'Customers' },
  { file: 'orders.csv', label: 'Sales history' }
] as const;

/** An absolute template URL, so a plain link downloads it without the app's auth. */
export function templateUrl(apiBase: string, file: string): string {
  return `${apiBase.replace(/\/+$/, '')}/integrations/templates/${file}`;
}
