import React, { useEffect, useRef } from 'react';
import { Box, FormHelperText, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconBold, IconItalic, IconLink, IconList } from '@tabler/icons-react';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type RichTextFieldValue = string;

const runFormat = (command: string, value?: string) => {
  // Lightweight formatting only — no new editor dependency.
  document.execCommand(command, false, value);
};

const RichTextField: React.FC<FieldEditorBaseProps<RichTextFieldValue>> = ({ field, value, onChange, disabled, showValidation }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const html = value ?? '';
  const requiredError = getRequiredError(field, html.replace(/<[^>]*>/g, '').trim(), showValidation);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    if (node.innerHTML !== html) {
      node.innerHTML = html;
    }
  }, [html]);

  const applyLink = () => {
    const url = window.prompt('Enter link URL');
    if (!url) {
      return;
    }
    runFormat('createLink', url);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </Typography>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          mb: 0.75,
          p: 0.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Tooltip title="Bold">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              aria-label="Bold"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runFormat('bold')}
            >
              <IconBold size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Italic">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              aria-label="Italic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runFormat('italic')}
            >
              <IconItalic size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Link">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              aria-label="Insert link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyLink}
            >
              <IconLink size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Bullet list">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              aria-label="Bullet list"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runFormat('insertUnorderedList')}
            >
              <IconList size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box
        ref={editorRef}
        role="textbox"
        aria-multiline
        aria-label={field.label}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        sx={{
          minHeight: 120,
          px: 1.5,
          py: 1,
          border: 1,
          borderColor: requiredError ? 'error.main' : 'divider',
          borderRadius: 1,
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
          outline: 'none',
          '&:focus': {
            borderColor: requiredError ? 'error.main' : 'primary.main'
          },
          '& ul': { pl: 2.5, m: 0 },
          '& a': { color: 'primary.main' }
        }}
      />

      <FormHelperText error={Boolean(requiredError)}>{requiredError || ' '}</FormHelperText>
    </Box>
  );
};

export default RichTextField;
