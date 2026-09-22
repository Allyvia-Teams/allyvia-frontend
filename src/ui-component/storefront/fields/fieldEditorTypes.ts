import type { SectionField } from 'types/storefront';

export type FieldEditorBaseProps<TValue> = {
  field: SectionField;
  value: TValue;
  onChange: (value: TValue) => void;
  disabled?: boolean;
  /** When true, required-empty and other validation messages are shown. */
  showValidation?: boolean;
};

export function isEmptyFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('url' in record || 'id' in record) {
      return !record.url && !record.id;
    }
    if ('kind' in record) {
      const kind = record.kind;
      const linkValue = record.value;
      if (kind === 'home') {
        return false;
      }
      return typeof linkValue !== 'string' || linkValue.trim().length === 0;
    }
  }
  return false;
}

export function getRequiredError(field: SectionField, value: unknown, showValidation?: boolean): string | undefined {
  if (!showValidation || !field.required) {
    return undefined;
  }
  if (isEmptyFieldValue(value)) {
    return `${field.label} is required`;
  }
  return undefined;
}
