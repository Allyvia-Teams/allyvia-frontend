import React, { useState } from 'react';
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
import type { SectionRegistry, StorefrontSection } from 'types/storefront';

export type SectionListProps = {
  sections: StorefrontSection[];
  registry: SectionRegistry;
  selectedSectionId?: string | null;
  onSelectSection: (sectionId: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onAddSection: () => void;
};

/** Omission means visible (Siddhant / T1 contract). */
export function sectionIsVisible(section: StorefrontSection): boolean {
  return section.is_visible !== false;
}

/** Custom label if set; otherwise registry SectionType.label. */
export function sectionRailLabel(section: StorefrontSection, registry: SectionRegistry): string {
  const custom = section.label?.trim();
  if (custom) {
    return custom;
  }
  return registry[section.type]?.label ?? section.type;
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  registry,
  selectedSectionId = null,
  onSelectSection,
  onToggleVisibility,
  onDuplicateSection,
  onDeleteSection,
  onReorderSections,
  onAddSection
}) => {
  // Contract order is array order (no per-section sort field).
  const orderedSections = sections;

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
          const visible = sectionIsVisible(section);
          const railLabel = sectionRailLabel(section, registry);

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
              aria-label={`Select ${railLabel} section`}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                opacity: draggedId === section.id ? 0.55 : visible ? 1 : 0.7,
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary', cursor: 'grab' }}>
                <IconGripVertical size={18} aria-hidden />
              </ListItemIcon>

              <ListItemText
                primary={railLabel}
                secondary={section.type}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                sx={{ mr: 0.5 }}
              />

              <Tooltip title={visible ? 'Hide section' : 'Show section'}>
                <IconButton
                  size="small"
                  aria-label={visible ? `Hide ${railLabel}` : `Show ${railLabel}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility(section.id);
                  }}
                >
                  {visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Section actions">
                <IconButton
                  size="small"
                  aria-label={`More actions for ${railLabel}`}
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
        <Button fullWidth variant="outlined" startIcon={<IconPlus size={18} />} onClick={onAddSection} aria-label="Add section">
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
