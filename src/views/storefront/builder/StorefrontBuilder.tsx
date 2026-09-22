import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import SectionList from 'ui-component/storefront/SectionList';
import FieldEditorRenderer from 'ui-component/storefront/fields/FieldEditorRenderer';
import type { SectionRegistry, StorefrontPage, StorefrontSection, JsonObject } from 'types/storefront';
import { mockPages } from './fixtures/mockPage';
import { mockSectionRegistry } from './fixtures/mockSectionRegistry';
import type { BuilderPage, StorefrontSectionInstance } from './types.local';
import { useBuilderData } from './useBuilderData';

const BUILDER_BREAKPOINT = 1024;

/** Map T1 StorefrontSection → local UI row (label / visibility pending Siddhant). */
function toUiSections(sections: StorefrontSection[], registry: SectionRegistry): StorefrontSectionInstance[] {
  return sections.map((section, index) => ({
    id: section.id,
    type: section.type,
    label: registry[section.type]?.label ?? section.type,
    is_visible: true,
    sort: index,
    settings: { ...(section.fields as Record<string, unknown>) }
  }));
}

function toBuilderPages(pages: StorefrontPage[], registry: SectionRegistry): BuilderPage[] {
  return pages.map((page) => ({
    ...page,
    sections: toUiSections(page.sections, registry)
  }));
}

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

/** Map local UI sections back to T1 StorefrontSection[] for updateSections. */
export function toContractSections(sections: StorefrontSectionInstance[]): StorefrontSection[] {
  return [...sections]
    .sort((a, b) => a.sort - b.sort)
    .map((section) => ({
      id: section.id,
      type: section.type,
      fields: section.settings as JsonObject
    }));
}

const StorefrontBuilder: React.FC = () => {
  const { registry: registryQuery, pages: pagesQuery } = useBuilderData();

  const [pages, setPages] = useState<BuilderPage[]>(() => toBuilderPages(mockPages, mockSectionRegistry));
  const [activePageId, setActivePageId] = useState(mockPages[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(mockPages[0]?.sections[0]?.id ?? null);
  const [showValidation, setShowValidation] = useState(false);

  const registry: SectionRegistry = registryQuery.data ?? mockSectionRegistry;

  // Prefer live T1 data when the queries succeed; otherwise keep fixture fallback.
  useEffect(() => {
    if (!pagesQuery.isFetched && !registryQuery.isFetched) {
      return;
    }

    const nextRegistry = registryQuery.data ?? mockSectionRegistry;
    const nextSource = pagesQuery.data && pagesQuery.data.length > 0 ? pagesQuery.data : mockPages;
    const next = toBuilderPages(nextSource, nextRegistry);

    setPages(next);
    setActivePageId((current) => (next.some((page) => page.id === current) ? current : (next[0]?.id ?? '')));
    setSelectedSectionId((current) => {
      const pageForSelection = next.find((page) => page.sections.some((section) => section.id === current)) ?? next[0];
      if (pageForSelection?.sections.some((section) => section.id === current)) {
        return current;
      }
      return pageForSelection?.sections[0]?.id ?? null;
    });
  }, [pagesQuery.isFetched, pagesQuery.data, registryQuery.isFetched, registryQuery.data]);

  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0], [pages, activePageId]);

  const selectedSection = useMemo(
    () => activePage?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [activePage, selectedSectionId]
  );

  const selectedSectionType = useMemo(
    () => (selectedSection ? (registry[selectedSection.type] ?? null) : null),
    [registry, selectedSection]
  );

  const updateActivePage = (updater: (page: BuilderPage) => BuilderPage) => {
    setPages((current) => current.map((page) => (page.id === activePage.id ? updater(page) : page)));
  };

  const handleToggleVisibility = (sectionId: string) => {
    // Local-only until Siddhant confirms visibility on the contract.
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

  const handleFieldChange = (key: string, nextValue: unknown) => {
    if (!selectedSectionId) {
      return;
    }

    setShowValidation(true);
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              settings: {
                ...section.settings,
                [key]: nextValue
              }
            }
          : section
      )
    }));
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
                setShowValidation(false);
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
              onSelectSection={(sectionId) => {
                setSelectedSectionId(sectionId);
                setShowValidation(false);
              }}
              onToggleVisibility={handleToggleVisibility}
              onDuplicateSection={handleDuplicateSection}
              onDeleteSection={handleDeleteSection}
              onReorderSections={handleReorderSections}
              onAddSection={handleAddSection}
            />
          ) : null}
        </Paper>

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

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minHeight: 200,
            order: 2,
            overflow: 'auto',
            [`@media (min-width:${BUILDER_BREAKPOINT}px)`]: {
              order: 3
            }
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Inspector
          </Typography>

          {!selectedSection || !selectedSectionType ? (
            <Typography variant="body2" color="text.secondary">
              Select a section to edit its fields. Theme panel placeholder.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                {selectedSection.label}
              </Typography>
              {selectedSectionType.fields.map((field) => (
                <FieldEditorRenderer
                  key={field.key}
                  field={field}
                  value={selectedSection.settings[field.key] ?? field.default ?? null}
                  showValidation={showValidation}
                  onChange={(nextValue) => handleFieldChange(field.key, nextValue)}
                />
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </MainCard>
  );
};

export default StorefrontBuilder;
