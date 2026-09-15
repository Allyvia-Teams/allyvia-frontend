import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography
} from '@mui/material';
import { IconDotsVertical, IconEye, IconEyeOff, IconGripVertical, IconPlus } from '@tabler/icons-react';
import type { StorefrontSectionInstance } from 'views/storefront/builder/types.local';

export type SectionListProps = {
  sections: StorefrontSectionInstance[];
  selectedSectionId?: string | null;
  onSelectSection: (sectionId: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onAddSection: () => void;
};

const SectionList: React.FC<SectionListProps> = ({
  sections,
  selectedSectionId = null,
  onSelectSection,
  onToggleVisibility,
  onDuplicateSection,
  onDeleteSection,
  onReorderSections,
  onAddSection
}) => {
  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.sort - b.sort),
    [sections]
  );

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSectionId, setMenuSectionId] = useState<string | null>(null);

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuSectionId(null);
  };

  const handleDragStart = (sectionId: string) => (event: React.DragEvent) => {
    setDraggedId(sectionId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => (event: React.DragEvent) => {
    event.preventDefault();
    const sourceId = draggedId || event.dataTransfer.getData('text/plain');
    setDraggedId(null);

    if (!sourceId || sourceId === targetId) {
      return;
    }

    const ids = orderedSections.map((section) => section.id);
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const next = [...ids];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderSections(next);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
        Sections
      </Typography>

      <List dense disablePadding sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {orderedSections.map((section) => {
          const selected = section.id === selectedSectionId;

          return (
            <ListItemButton
              key={section.id}
              selected={selected}
              draggable
              onDragStart={handleDragStart(section.id)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(section.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSection(section.id)}
              aria-label={`Select ${section.label} section`}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                opacity: draggedId === section.id ? 0.55 : section.is_visible ? 1 : 0.7,
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary', cursor: 'grab' }}>
                <IconGripVertical size={18} aria-hidden />
              </ListItemIcon>

              <ListItemText
                primary={section.label}
                secondary={section.type}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                sx={{ mr: 0.5 }}
              />

              <Tooltip title={section.is_visible ? 'Hide section' : 'Show section'}>
                <IconButton
                  size="small"
                  aria-label={section.is_visible ? `Hide ${section.label}` : `Show ${section.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility(section.id);
                  }}
                >
                  {section.is_visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Section actions">
                <IconButton
                  size="small"
                  aria-label={`More actions for ${section.label}`}
                  aria-haspopup="menu"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuAnchor(event.currentTarget);
                    setMenuSectionId(section.id);
                  }}
                >
                  <IconDotsVertical size={16} />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ pt: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<IconPlus size={18} />}
          onClick={onAddSection}
          aria-label="Add section"
        >
          Add section
        </Button>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && Boolean(menuSectionId)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (menuSectionId) {
              onDuplicateSection(menuSectionId);
            }
            closeMenu();
          }}
        >
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuSectionId) {
              onDeleteSection(menuSectionId);
            }
            closeMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SectionList;
