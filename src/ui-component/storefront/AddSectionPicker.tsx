import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconGridDots, IconHelp, IconLayoutRows, IconPhoto, IconPuzzle, IconSearch, IconX } from '@tabler/icons-react';
import type { SectionRegistry, SectionType } from 'types/storefront';

export type AddSectionPickerProps = {
  open: boolean;
  registry: SectionRegistry;
  /** Current page section type keys — used for max_per_page checks. */
  existingSectionTypes: string[];
  onClose: () => void;
  onSelect: (sectionType: string) => void;
};

function iconFor(iconKey: string): React.ReactNode {
  const props = { size: 20, 'aria-hidden': true as const };
  switch (iconKey) {
    case 'layout-hero':
      return <IconLayoutRows {...props} />;
    case 'grid':
      return <IconGridDots {...props} />;
    case 'photo':
      return <IconPhoto {...props} />;
    case 'help':
      return <IconHelp {...props} />;
    default:
      return <IconPuzzle {...props} />;
  }
}

function countOfType(existing: string[], typeKey: string): number {
  return existing.filter((entry) => entry === typeKey).length;
}

function isAtMax(sectionType: SectionType, existing: string[], typeKey: string): boolean {
  if (sectionType.max_per_page == null) return false;
  return countOfType(existing, typeKey) >= sectionType.max_per_page;
}

/**
 * Flat registry picker with search. T1 SectionType has no purpose/category —
 * keep one alphabetical list until the API grows grouping metadata.
 */
const AddSectionPicker: React.FC<AddSectionPickerProps> = ({ open, registry, existingSectionTypes, onClose, onSelect }) => {
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(registry)
      .map(([typeKey, sectionType]) => ({ typeKey, sectionType }))
      .filter(({ typeKey, sectionType }) => {
        if (!q) return true;
        return sectionType.label.toLowerCase().includes(q) || typeKey.toLowerCase().includes(q);
      })
      .sort((a, b) => a.sectionType.label.localeCompare(b.sectionType.label));
  }, [registry, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" aria-labelledby="add-section-picker-title">
      <DialogTitle id="add-section-picker-title" sx={{ pr: 6 }}>
        Add section
        <IconButton aria-label="Close" onClick={handleClose} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          size="small"
          fullWidth
          placeholder="Search sections"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', mr: 1, color: 'text.secondary' }}>
                <IconSearch size={16} aria-hidden />
              </Box>
            )
          }}
          sx={{ mb: 1.5 }}
          inputProps={{ 'aria-label': 'Search sections' }}
        />

        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No matching sections
          </Typography>
        ) : (
          <List dense disablePadding>
            {entries.map(({ typeKey, sectionType }) => {
              const atMax = isAtMax(sectionType, existingSectionTypes, typeKey);
              const item = (
                <ListItemButton
                  key={typeKey}
                  disabled={atMax}
                  onClick={() => {
                    if (atMax) return;
                    onSelect(typeKey);
                    setQuery('');
                  }}
                  aria-label={`Add ${sectionType.label} section`}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{iconFor(sectionType.icon)}</ListItemIcon>
                  <ListItemText
                    primary={sectionType.label}
                    secondary={typeKey}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItemButton>
              );

              if (!atMax) {
                return item;
              }

              return (
                <Tooltip key={typeKey} title="Maximum reached for this page" placement="left">
                  <span>{item}</span>
                </Tooltip>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddSectionPicker;
