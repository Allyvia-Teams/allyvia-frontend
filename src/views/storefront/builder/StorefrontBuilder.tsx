import React, { useMemo, useState } from 'react';
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import SectionList from 'ui-component/storefront/SectionList';
import { mockPages } from './fixtures/mockPage';
import type { StorefrontPage, StorefrontSectionInstance } from './types.local';

const BUILDER_BREAKPOINT = 1024;

function reorderSections(sections: StorefrontSectionInstance[], orderedIds: string[]): StorefrontSectionInstance[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  return orderedIds
    .map((id, index) => {
      const section = byId.get(id);
      if (!section) {
        return null;
      }
      return { ...section, sort: index };
    })
    .filter((section): section is StorefrontSectionInstance => Boolean(section));
}

const StorefrontBuilder: React.FC = () => {
  const [pages, setPages] = useState<StorefrontPage[]>(() =>
    mockPages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({ ...section }))
    }))
  );
  const [activePageId, setActivePageId] = useState(mockPages[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    mockPages[0]?.sections[0]?.id ?? null
  );

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? pages[0],
    [pages, activePageId]
  );

  const updateActivePage = (updater: (page: StorefrontPage) => StorefrontPage) => {
    setPages((current) =>
      current.map((page) => (page.id === activePage.id ? updater(page) : page))
    );
  };

  const handleToggleVisibility = (sectionId: string) => {
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((section) =>
        section.id === sectionId ? { ...section, is_visible: !section.is_visible } : section
      )
    }));
  };

  const handleDuplicateSection = (sectionId: string) => {
    updateActivePage((page) => {
      const source = page.sections.find((section) => section.id === sectionId);
      if (!source) {
        return page;
      }

      const duplicate: StorefrontSectionInstance = {
        ...source,
        id: `${source.id}_copy_${Date.now()}`,
        label: `${source.label} copy`,
        sort: source.sort + 1,
        settings: { ...source.settings }
      };

      const sections = page.sections
        .map((section) => (section.sort > source.sort ? { ...section, sort: section.sort + 1 } : section))
        .concat(duplicate)
        .sort((a, b) => a.sort - b.sort);

      return { ...page, sections };
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    updateActivePage((page) => {
      const remaining = page.sections
        .filter((section) => section.id !== sectionId)
        .sort((a, b) => a.sort - b.sort)
        .map((section, index) => ({ ...section, sort: index }));

      return { ...page, sections: remaining };
    });

    setSelectedSectionId((current) => (current === sectionId ? null : current));
  };

  const handleReorderSections = (orderedIds: string[]) => {
    updateActivePage((page) => ({
      ...page,
      sections: reorderSections(page.sections, orderedIds)
    }));
  };

  const handleAddSection = () => {
    // Section picker modal lands in a later T2 step.
  };

  return (
    <MainCard title="Online Storefront" contentSX={{ p: { xs: 1.5, md: 2 } }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          minHeight: 'auto',
          gridTemplateColumns: '1fr',
          [`@media (min-width:${BUILDER_BREAKPOINT}px)`]: {
            minHeight: '70vh',
            gridTemplateColumns: '280px minmax(0, 1fr) 300px'
          }
        }}
      >
        {/* Left rail */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            order: 1
          }}
        >
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel id="storefront-page-switcher-label">Page</InputLabel>
            <Select
              labelId="storefront-page-switcher-label"
              label="Page"
              value={activePage?.id ?? ''}
              onChange={(event) => {
                const nextPageId = String(event.target.value);
                setActivePageId(nextPageId);
                const nextPage = pages.find((page) => page.id === nextPageId);
                setSelectedSectionId(nextPage?.sections[0]?.id ?? null);
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page.id} value={page.id}>
                  {page.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ mb: 1.5 }} />

          {activePage ? (
            <SectionList
              sections={activePage.sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onToggleVisibility={handleToggleVisibility}
              onDuplicateSection={handleDuplicateSection}
              onDeleteSection={handleDeleteSection}
              onReorderSections={handleReorderSections}
              onAddSection={handleAddSection}
            />
          ) : null}
        </Paper>

        {/* Centre preview */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            bgcolor: 'grey.50',
            order: 3,
            [`@media (min-width:${BUILDER_BREAKPOINT}px)`]: {
              order: 2
            }
          }}
        >
          <Box>
            <Typography variant="h5" gutterBottom>
              Live preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preview coming once T1&apos;s endpoint is ready
            </Typography>
          </Box>
        </Paper>

        {/* Right panel */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minHeight: 200,
            order: 2,
            [`@media (min-width:${BUILDER_BREAKPOINT}px)`]: {
              order: 3
            }
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Inspector
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedSectionId
              ? `Field editor for section ${selectedSectionId} — coming next.`
              : 'Select a section to edit its fields. Theme panel placeholder.'}
          </Typography>
        </Paper>
      </Box>
    </MainCard>
  );
};

export default StorefrontBuilder;
