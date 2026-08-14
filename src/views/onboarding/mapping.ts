// Pure mapping-table logic: row building, the client-side mirror of the
// backend's validate_mappings / validate_required_fields, PATCH payload
// building, confidence bands, and transform labels.
// Mirrors backend/app/onboarding/mapping.py + transforms.py.

import type {
  BQSchemaField,
  FieldMappings,
  MappingProposal,
  MappingSource,
  OnboardingRegistry,
  ProposalPatch,
  StagedTablePreview
} from 'api/onboarding.api';

// Uses registry.legacy_type_map (INTEGER→INT64 etc.); unknown types pass
// through uppercased/trimmed.
export function normalizeType(bqType: string, legacyMap: Record<string, string>): string {
  const cleaned = bqType.trim().toUpperCase();
  return legacyMap[cleaned] || cleaned;
}

export type ConfidenceBand = 'high' | 'medium' | 'low' | 'review';

// null/undefined = degraded/manual-review path (mapping.py stores null when
// Gemini degrades). Gemini's gate-capped 0.5 deliberately lands in 'low'.
export function confidenceBand(confidence: number | null | undefined): ConfidenceBand {
  if (confidence === null || confidence === undefined) return 'review';
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

const SAMPLE_MAX_CHARS = 60;

// Distinct sample values for a column: skips null/undefined/'' (keeps 0 and
// false), String()-ified, truncated to 60 chars + '…'.
export function sampleValues(rows: Array<Record<string, unknown>>, column: string, limit: number = 3): string[] {
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const row of rows) {
    if (samples.length >= limit) break;
    const value = row[column];
    if (value === null || value === undefined || value === '') continue;
    const text = String(value);
    if (seen.has(text)) continue;
    seen.add(text);
    samples.push(text.length > SAMPLE_MAX_CHARS ? `${text.slice(0, SAMPLE_MAX_CHARS)}…` : text);
  }
  return samples;
}

export interface MappingRow {
  column: string;
  rawType: string;
  displayType: string; // normalizeType(rawType, registry.legacy_type_map)
  samples: string[];
  target: string;
  confidence: number | null;
  source: MappingSource;
  transforms: string[];
}

// One row per schema column, in schema order. A column missing from
// field_mappings renders as unmapped: target '', confidence null, source 'manual'.
export function buildRows(
  schema: BQSchemaField[],
  proposal: Pick<MappingProposal, 'field_mappings' | 'transforms'>,
  preview: StagedTablePreview | undefined,
  registry: OnboardingRegistry
): MappingRow[] {
  const previewRows = preview?.rows ?? [];
  return schema.map((field) => {
    const entry = proposal.field_mappings[field.name];
    return {
      column: field.name,
      rawType: field.type,
      displayType: normalizeType(field.type, registry.legacy_type_map),
      samples: sampleValues(previewRows, field.name),
      target: entry?.target ?? '',
      confidence: entry?.confidence ?? null,
      source: entry?.source ?? 'manual',
      transforms: proposal.transforms[field.name] ?? []
    };
  });
}

// The three non-canonical targets differ in KIND, not degree, so the wording
// has to make the destructive one unmistakable.
const SENTINEL_DESCRIPTIONS: Record<string, string> = {
  extra: 'Keep as a searchable custom field',
  semantic_only: 'Keep for AI retrieval only (not filterable)',
  ignore: 'Drop this column — it will not be imported'
};

const SENTINEL_LABELS: Record<string, string> = {
  extra: 'Extra',
  semantic_only: 'Semantic only',
  ignore: 'Ignore (drop)'
};

export interface TargetOptionGroup {
  label: string;
  options: Array<{ value: string; label: string; description: string; required: boolean }>;
}

// Group 1: the entity's canonical fields; group 2 (always last): the sentinel
// "Keep unmapped" targets from the registry.
export function targetOptions(registry: OnboardingRegistry, entity: string): TargetOptionGroup[] {
  const groups: TargetOptionGroup[] = [];
  const entityDef = registry.entities[entity];
  if (entityDef) {
    groups.push({
      label: entityDef.name,
      options: entityDef.fields.map((field) => ({
        value: field.name,
        label: field.name,
        description: field.description,
        required: field.required
      }))
    });
  }
  groups.push({
    label: 'Keep unmapped',
    options: registry.sentinel_targets.map((sentinel) => ({
      value: sentinel,
      label: SENTINEL_LABELS[sentinel] ?? sentinel,
      description: SENTINEL_DESCRIPTIONS[sentinel] ?? '',
      required: false
    }))
  });
  return groups;
}

// A human choice is definitive: confidence 1.0, source 'manual' (the backend
// stores confidence/source verbatim). Immutable update.
export function applyTargetChange(fieldMappings: FieldMappings, column: string, target: string): FieldMappings {
  return { ...fieldMappings, [column]: { target, confidence: 1.0, source: 'manual' } };
}

function validTargetsFor(registry: OnboardingRegistry, entity: string): Set<string> {
  const targets = new Set<string>(registry.sentinel_targets);
  const entityDef = registry.entities[entity];
  if (entityDef) {
    for (const field of entityDef.fields) targets.add(field.name);
  }
  return targets;
}

// Switching entity: targets valid for the new entity (or sentinel) survive;
// everything else is reset to extra and reported in resetColumns.
export function remapForEntity(
  fieldMappings: FieldMappings,
  registry: OnboardingRegistry,
  newEntity: string
): { fieldMappings: FieldMappings; resetColumns: string[] } {
  const valid = validTargetsFor(registry, newEntity);
  const next: FieldMappings = {};
  const resetColumns: string[] = [];
  for (const [column, entry] of Object.entries(fieldMappings)) {
    if (valid.has(entry.target)) {
      next[column] = entry;
    } else {
      next[column] = { target: 'extra', confidence: null, source: 'manual' };
      resetColumns.push(column);
    }
  }
  return { fieldMappings: next, resetColumns };
}

// FULL replacement payload: every schema column present (unmapped columns
// forced to 'extra'); transforms omitted so the server recomputes them.
export function buildPatchPayload(entity: string, fieldMappings: FieldMappings, columns: string[]): ProposalPatch {
  const full: FieldMappings = {};
  for (const column of columns) {
    const entry = fieldMappings[column];
    if (entry && entry.target) {
      full[column] = entry;
    } else {
      full[column] = { target: 'extra', confidence: null, source: 'manual' };
    }
  }
  return { proposed_entity: entity, field_mappings: full };
}

// --- composite (date + time -> TIMESTAMP) -----------------------------------
// Client mirror of the backend's ONE typed exception to one-column-per-target
// (mapping.composite_pairs). Two columns may share a target iff the field is
// TIMESTAMP and the pair is one date-like + one time-like column.
//
// Role precedence matches the backend exactly: the persisted composite_role
// first, then the schema type, then the sample shape. When it is genuinely
// ambiguous the client lets the PATCH through — the server is authoritative and
// its 400 renders under the row already.

const DATE_SAMPLE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;
const TIME_SAMPLE = /^\d{1,2}:\d{2}(:\d{2})?(\s?[AaPp][Mm])?$/;
const COMPOSITE_SAMPLE_MIN_RATIO = 0.8;

export interface CompositePair {
  dateCol: string;
  timeCol: string;
  // The zone column, when one is mapped. It does not CLAIM the timestamp
  // target — it has its own canonical home (source_timezone) — but it feeds
  // the same combined expression, so the wizard shows it in the group.
  zoneCol?: string;
}

// Mirrors registry.SOURCE_TIMEZONE_FIELD.
export const SOURCE_TIMEZONE_FIELD = 'source_timezone';

function sampleRatio(samples: string[], re: RegExp): number {
  const nonEmpty = (samples ?? []).filter((v) => String(v).trim());
  if (nonEmpty.length === 0) return 0;
  return nonEmpty.filter((v) => re.test(String(v).trim())).length / nonEmpty.length;
}

export function isDateLikeColumn(row: MappingRow | undefined): boolean {
  if (!row) return false;
  if (row.rawType?.toUpperCase() === 'DATE') return true;
  if (row.rawType?.toUpperCase() !== 'STRING') return false;
  return sampleRatio(row.samples, DATE_SAMPLE) >= COMPOSITE_SAMPLE_MIN_RATIO;
}

export function isTimeLikeColumn(row: MappingRow | undefined): boolean {
  if (!row) return false;
  if (row.rawType?.toUpperCase() === 'TIME') return true;
  if (row.rawType?.toUpperCase() !== 'STRING') return false;
  return sampleRatio(row.samples, TIME_SAMPLE) >= COMPOSITE_SAMPLE_MIN_RATIO;
}

// Mirrors mapping.composite_error_message — kept byte-identical so a client
// pre-flight message and the server's 400 detail read the same.
export function compositeErrorMessage(target: string): string {
  return `${target} can combine exactly one date column and one time column.`;
}

// The column mapped to source_timezone, if any. Found by TARGET, mirroring
// mapping.zone_column — it is a combine member without being a co-claimant.
export function zoneColumn(
  entity: string,
  fieldMappings: FieldMappings,
  registry: OnboardingRegistry
): string | undefined {
  const entityDef = registry.entities[entity];
  if (!entityDef?.fields.some((f) => f.name === SOURCE_TIMEZONE_FIELD)) return undefined;
  return Object.keys(fieldMappings).find((column) => fieldMappings[column]?.target === SOURCE_TIMEZONE_FIELD);
}

export function compositePairs(
  entity: string,
  fieldMappings: FieldMappings,
  rows: MappingRow[],
  registry: OnboardingRegistry
): Map<string, CompositePair> {
  const byColumn = new Map(rows.map((r) => [r.column, r]));
  const sentinels = new Set(registry.sentinel_targets);
  const entityDef = registry.entities[entity];
  const pairs = new Map<string, CompositePair>();
  if (!entityDef) return pairs;
  // Only meaningful once a date+time pair exists; mapped on its own the zone
  // column is an ordinary field.
  const zoneCol = zoneColumn(entity, fieldMappings, registry);

  const claimants: Record<string, string[]> = {};
  for (const [column, entry] of Object.entries(fieldMappings)) {
    if (!entry?.target || sentinels.has(entry.target)) continue;
    (claimants[entry.target] = claimants[entry.target] ?? []).push(column);
  }

  for (const [target, cols] of Object.entries(claimants)) {
    if (cols.length !== 2) continue;
    const field = entityDef.fields.find((f) => f.name === target);
    if (!field || field.type !== 'TIMESTAMP') continue;

    // Persisted roles win — they are the only signal that survives to render.
    const byRole = {
      date: cols.filter((c) => fieldMappings[c]?.composite_role === 'date'),
      time: cols.filter((c) => fieldMappings[c]?.composite_role === 'time')
    };
    if (byRole.date.length === 1 && byRole.time.length === 1) {
      pairs.set(target, { dateCol: byRole.date[0], timeCol: byRole.time[0], zoneCol });
      continue;
    }

    const dates = cols.filter((c) => isDateLikeColumn(byColumn.get(c)));
    const times = cols.filter((c) => isTimeLikeColumn(byColumn.get(c)));
    if (dates.length === 1 && times.length === 1 && dates[0] !== times[0]) {
      pairs.set(target, { dateCol: dates[0], timeCol: times[0], zoneCol });
    }
  }
  return pairs;
}

// Flat lookup for rendering: column -> the other members of its combine,
// in date, time, zone order.
export function compositePartners(pairs: Map<string, CompositePair>): Map<string, string> {
  const partners = new Map<string, string>();
  for (const { dateCol, timeCol, zoneCol } of pairs.values()) {
    const members = [dateCol, timeCol, ...(zoneCol ? [zoneCol] : [])];
    for (const member of members) {
      partners.set(member, members.filter((other) => other !== member).join(', '));
    }
  }
  return partners;
}

// What the transforms column shows for a combine member. Members carry no
// transforms by design (the renderer builds one self-contained expression), so
// this says what IS happening instead of an em-dash. The zone column gets its
// own label: it feeds the combine but does not itself become a TIMESTAMP.
// Returns null for columns outside any combine.
export function combineChipLabel(column: string, pairs: Map<string, CompositePair>): string | null {
  for (const { dateCol, timeCol, zoneCol } of pairs.values()) {
    if (column === zoneCol) return 'Supplies timezone';
    if (column === dateCol || column === timeCol) return 'Combine → TIMESTAMP';
  }
  return null;
}

// Client mirror of backend validate_mappings (mapping.py) — same error-dict
// shape so a 400 detail and client-side errors share one renderer.
// Returns {} when valid.
export function validateMappings(
  entity: string,
  fieldMappings: FieldMappings,
  columns: string[],
  registry: OnboardingRegistry,
  // Needed only to adjudicate a contended target. Omitted (or empty) means a
  // composite can still be recognised from persisted roles, but never from
  // sample shape — the same safe-default the backend takes without a schema.
  rows: MappingRow[] = []
): Record<string, string> {
  const errors: Record<string, string> = {};
  const columnSet = new Set(columns);
  const mappedColumns = Object.keys(fieldMappings);

  const unknown = mappedColumns.filter((c) => !columnSet.has(c));
  const missing = columns.filter((c) => !(c in fieldMappings));
  if (unknown.length > 0) {
    errors.field_mappings = `Unknown column(s): ${unknown.join(', ')}.`;
  } else if (missing.length > 0) {
    errors.field_mappings = `Every column must be mapped. Missing: ${missing.join(', ')}. Mark unneeded columns as "extra".`;
  }

  const sentinels = new Set(registry.sentinel_targets);

  if (!entity) {
    const allSentinel = mappedColumns.every((c) => sentinels.has(fieldMappings[c].target));
    if (!allSentinel) {
      errors.proposed_entity = 'An entity is required unless every column is left unmapped.';
    }
    return errors;
  }

  if (!registry.entities[entity]) {
    errors.proposed_entity = `Unknown entity "${entity}".`;
    return errors;
  }

  const valid = validTargetsFor(registry, entity);
  const claimants: Record<string, string[]> = {};
  for (const [column, entry] of Object.entries(fieldMappings)) {
    if (!valid.has(entry.target)) {
      errors[column] = `"${entry.target}" is not a valid target for ${entity}.`;
      continue;
    }
    if (!sentinels.has(entry.target)) {
      (claimants[entry.target] = claimants[entry.target] ?? []).push(column);
    }
  }
  const legalComposites = compositePairs(entity, fieldMappings, rows, registry);
  const byColumn = new Map(rows.map((r) => [r.column, r]));
  for (const [target, cols] of Object.entries(claimants)) {
    if (cols.length <= 1 || legalComposites.has(target)) continue;

    // A TIMESTAMP target, or a date+time pair aimed at something else, is a
    // composite ATTEMPT — say precisely what a composite needs. Anything else
    // keeps this file's existing duplicate wording (deliberately NOT the
    // backend's string: it is user-facing copy and predates the mirror).
    const field = registry.entities[entity]?.fields.find((f) => f.name === target);
    const attemptedComposite =
      field?.type === 'TIMESTAMP' ||
      (cols.length === 2 && cols.some((c) => isDateLikeColumn(byColumn.get(c))) && cols.some((c) => isTimeLikeColumn(byColumn.get(c))));

    for (const column of cols) {
      errors[column] = attemptedComposite
        ? compositeErrorMessage(target)
        : `"${target}" is already mapped from ${cols.filter((c) => c !== column).join(', ')}.`;
    }
  }
  return errors;
}

// Client mirror of confirm-time validate_required_fields — drives the
// non-blocking pre-confirm warning. Unknown entity → [] (confirm handles it).
export function missingRequiredFields(entity: string, fieldMappings: FieldMappings, registry: OnboardingRegistry): string[] {
  const entityDef = registry.entities[entity];
  if (!entityDef) return [];
  const mapped = new Set(Object.values(fieldMappings).map((entry) => entry.target));
  return entityDef.fields.filter((field) => field.required && !mapped.has(field.name)).map((field) => field.name);
}

const TRANSFORM_LABELS: Record<string, string> = {
  strip_whitespace: 'Trim whitespace',
  currency_to_decimal: 'Currency → decimal',
  parse_date: 'Parse date',
  parse_timestamp: 'Parse timestamp'
};

// Closed vocabulary from transforms.py; unknown ops pass through verbatim
// (forward-compatible with new backend ops).
export function transformLabel(op: string): string {
  if (op.startsWith('safe_cast:')) return `Cast to ${op.slice('safe_cast:'.length)}`;
  return TRANSFORM_LABELS[op] ?? op;
}
