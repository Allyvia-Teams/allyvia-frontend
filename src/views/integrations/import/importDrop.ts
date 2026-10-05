// The Import data screen's pure seam (context-graph P1b).
//
// Everything the screen decides lives here so it can be tested without a DOM:
// the table's rows, the lane counts, the sentences that say why Approve is
// off, what a file may be reclassified as, and how often to poll. Approve
// itself is the SERVER's answer (`can_approve`), never recomputed here — the
// onboarding lane's readiness is a company-wide fact this screen cannot see.

import type { BulkDrop, DropFile, DropLane } from 'api/importDrops.api';

export type RowTone = 'direct' | 'onboarding' | 'refused';

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
  failed: 'Failed'
};

const TONE_ORDER: Record<RowTone, number> = { direct: 0, onboarding: 1, refused: 2 };

export const FAST_POLL_MS = 2500;
export const SLOW_POLL_MS = 10000;

export function mappingLink(sourceId: string): string {
  return `/settings?tab=onboarding&step=4&source=${encodeURIComponent(sourceId)}`;
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? (entity ? entity : '—');
}

function toneOf(file: DropFile): RowTone {
  if (file.status === 'refused') return 'refused';
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
      return {
        id: file.id,
        displayName: file.member || file.name,
        containerName: file.member ? file.name : '',
        lane: file.lane,
        tone,
        laneLabel: tone === 'refused' ? 'Not imported' : file.lane === 'integrations' ? 'Direct import' : 'Onboarding',
        entityLabel: entityLabel(file.entity),
        statusLabel: statusLabel(file),
        confidenceLabel: file.confidence == null ? '—' : `${Math.round(file.confidence * 100)}%`,
        reason: file.reason,
        mappingLink: file.onboarding?.needs_mapping ? mappingLink(file.onboarding.source_id) : null,
        file
      };
    })
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.displayName.localeCompare(b.displayName));
}

export function laneCounts(drop: BulkDrop): { direct: number; onboarding: number; refused: number } {
  const counts = { direct: 0, onboarding: 0, refused: 0 };
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
  if (unmapped) {
    sentences.push(`${plural(unmapped, 'file needs its', 'files need their')} columns confirmed in onboarding.`);
  }
  return sentences;
}

/** What a file may be moved to. Nothing once it is in onboarding, refused, or importing. */
export function reclassifyOptions(drop: BulkDrop, file: DropFile): ReclassifyOption[] {
  if (['committing', 'completed'].includes(drop.status)) return [];
  if (file.status === 'sent' || file.status === 'refused') return [];
  const direct: ReclassifyOption[] = DIRECT_ENTITIES.filter((entity) => !(file.lane === 'integrations' && entity === file.entity)).map(
    (entity) => ({ label: `Import as ${ENTITY_LABELS[entity]}`, lane: 'integrations', entity })
  );
  if (file.lane === 'integrations') {
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
