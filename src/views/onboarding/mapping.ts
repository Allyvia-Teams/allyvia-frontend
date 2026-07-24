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

const SENTINEL_DESCRIPTIONS: Record<string, string> = {
  extra: 'Preserve raw value in the extra JSON column',
  semantic_only: 'Keep for AI retrieval only'
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
      label: sentinel === 'extra' ? 'Extra' : sentinel === 'semantic_only' ? 'Semantic only' : sentinel,
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

// Client mirror of backend validate_mappings (mapping.py) — same error-dict
// shape so a 400 detail and client-side errors share one renderer.
// Returns {} when valid.
export function validateMappings(
  entity: string,
  fieldMappings: FieldMappings,
  columns: string[],
  registry: OnboardingRegistry
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
  for (const [target, cols] of Object.entries(claimants)) {
    if (cols.length > 1) {
      for (const column of cols) {
        errors[column] = `"${target}" is already mapped from ${cols.filter((c) => c !== column).join(', ')}.`;
      }
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
