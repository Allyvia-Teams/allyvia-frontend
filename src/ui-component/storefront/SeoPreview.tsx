import React from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';

export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 155;

export function truncateAt(text: string, limit: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export type SeoPreviewProps = {
  seoTitle: string;
  seoDescription: string;
  handle: string;
  /** Optional site host shown in the green URL line. */
  siteHost?: string;
};

/**
 * Mock Google SERP card. Title ~60 chars, description ~155 chars.
 */
const SeoPreview: React.FC<SeoPreviewProps> = ({ seoTitle, seoDescription, handle, siteHost = 'yourstore.allyvia.com' }) => {
  const title = truncateAt(seoTitle || 'Page title', SEO_TITLE_LIMIT);
  const description = truncateAt(
    seoDescription || 'Add a meta description to control how this page appears in search results.',
    SEO_DESCRIPTION_LIMIT
  );
  const path = handle === 'home' || handle === '' ? '/' : `/${handle}`;

  return (
    <Box
      sx={{
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        fontFamily: 'Arial, sans-serif'
      }}
      aria-label="Google search result preview"
    >
      <Typography
        sx={{
          color: '#1a0dab',
          fontSize: 18,
          lineHeight: 1.3,
          textDecoration: 'underline',
          cursor: 'default',
          mb: 0.25
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ color: '#006621', fontSize: 13, mb: 0.5 }}>
        https://{siteHost}
        {path}
      </Typography>
      <Typography sx={{ color: '#545454', fontSize: 13, lineHeight: 1.4 }}>{description}</Typography>
    </Box>
  );
};

export type SeoFieldsEditorProps = {
  seoTitle: string;
  seoDescription: string;
  handle: string;
  siteHost?: string;
  disabled?: boolean;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
};

/** Character-counted SEO inputs + live SERP preview. */
export const SeoFieldsEditor: React.FC<SeoFieldsEditorProps> = ({
  seoTitle,
  seoDescription,
  handle,
  siteHost,
  disabled,
  onSeoTitleChange,
  onSeoDescriptionChange
}) => {
  return (
    <Stack spacing={1.5}>
      <Box>
        <TextField
          size="small"
          fullWidth
          label="SEO title"
          value={seoTitle}
          disabled={disabled}
          onChange={(event) => onSeoTitleChange(event.target.value)}
          inputProps={{ 'aria-label': 'SEO title' }}
        />
        <Typography variant="caption" color={seoTitle.length > SEO_TITLE_LIMIT ? 'error' : 'text.secondary'}>
          {seoTitle.length} / {SEO_TITLE_LIMIT}
        </Typography>
      </Box>

      <Box>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          label="SEO description"
          value={seoDescription}
          disabled={disabled}
          onChange={(event) => onSeoDescriptionChange(event.target.value)}
          inputProps={{ 'aria-label': 'SEO description' }}
        />
        <Typography variant="caption" color={seoDescription.length > SEO_DESCRIPTION_LIMIT ? 'error' : 'text.secondary'}>
          {seoDescription.length} / {SEO_DESCRIPTION_LIMIT}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Search preview
      </Typography>
      <SeoPreview seoTitle={seoTitle} seoDescription={seoDescription} handle={handle} siteHost={siteHost} />
    </Stack>
  );
};

export default SeoPreview;
