import React from 'react';
import { Typography } from '@mui/material';
import type { SectionField } from 'types/storefront';
import TextField from './TextField';
import RichTextField from './RichTextField';
import MediaField from './MediaField';
import MediaListField from './MediaListField';
import LinkField from './LinkField';
import ColorField from './ColorField';
import SelectField from './SelectField';
import ToggleField from './ToggleField';
import NumberField from './NumberField';
import ProductRefField from './ProductRefField';
import CollectionRefField from './CollectionRefField';

export type FieldEditorRendererProps = {
  field: SectionField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  showValidation?: boolean;
};

/**
 * Single switch on field.type. Section-specific branching must not live elsewhere.
 */
const FieldEditorRenderer: React.FC<FieldEditorRendererProps> = ({ field, value, onChange, disabled, showValidation }) => {
  const shared = {
    field,
    disabled,
    showValidation,
    onChange
  };

  switch (field.type) {
    case 'text':
      return <TextField {...shared} value={(value as string) ?? ''} onChange={onChange} />;
    case 'richtext':
      return <RichTextField {...shared} value={(value as string) ?? ''} onChange={onChange} />;
    case 'media':
      return <MediaField {...shared} value={(value as any) ?? null} onChange={onChange} />;
    case 'media_list':
      return <MediaListField {...shared} value={(value as any) ?? []} onChange={onChange} />;
    case 'link':
      return <LinkField {...shared} value={(value as any) ?? { kind: 'home' }} onChange={onChange} />;
    case 'color':
      return <ColorField {...shared} value={(value as string) ?? ''} onChange={onChange} />;
    case 'select':
      return <SelectField {...shared} value={(value as string) ?? ''} onChange={onChange} />;
    case 'toggle':
      return <ToggleField {...shared} value={Boolean(value)} onChange={onChange} />;
    case 'number':
      return (
        <NumberField
          {...shared}
          value={typeof value === 'number' ? value : value === null || value === undefined ? null : Number(value)}
          onChange={onChange}
        />
      );
    case 'product_ref':
      return <ProductRefField {...shared} value={(value as string) ?? null} onChange={onChange} />;
    case 'collection_ref':
      return <CollectionRefField {...shared} value={(value as string) ?? null} onChange={onChange} />;
    default:
      return (
        <Typography variant="body2" color="error">
          Unsupported field type: {(field as SectionField).type}
        </Typography>
      );
  }
};

export default FieldEditorRenderer;
