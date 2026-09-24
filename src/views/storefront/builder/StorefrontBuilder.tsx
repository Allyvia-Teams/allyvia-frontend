import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Divider, FormControl, InputLabel, Link, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import SectionList, { sectionIsVisible, sectionRailLabel } from 'ui-component/storefront/SectionList';
import FieldEditorRenderer from 'ui-component/storefront/fields/FieldEditorRenderer';
import type { SectionRegistry, StorefrontPage, StorefrontSection, UpdateSectionsPayload } from 'types/storefront';
import { mockPages } from './fixtures/mockPage';
import { mockSectionRegistry } from './fixtures/mockSectionRegistry';
import { formatSavedAgo, useAutosave, type SaveStatus } from './useAutosave';
import { useBuilderData } from './useBuilderData';
import { useUndoStack } from './useUndoStack';

const BUILDER_BREAKPOINT = 1024;

type BuilderSnapshot = {
  pages: StorefrontPage[];
  activePageId: string;
  selectedSectionId: string | null;
};

function clonePages(pages: StorefrontPage[]): StorefrontPage[] {
  return pages.map((page) => ({
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      fields: { ...section.fields }
    }))
  }));
}

function reorderSections(sections: StorefrontSection[], orderedIds: string[]): StorefrontSection[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  return orderedIds.map((id) => byId.get(id)).filter((section): section is StorefrontSection => Boolean(section));
}

function SaveStatusLabel({ status, lastSavedAt, onRetry }: { status: SaveStatus; lastSavedAt: number | null; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'saved' || lastSavedAt === null) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status, lastSavedAt]);

  if (status === 'saving') {
    return (
      <Typography variant="caption" color="text.secondary" aria-live="polite">
        Saving…
      </Typography>
    );
  }

  if (status === 'error') {
    return (
      <Link component="button" type="button" variant="caption" color="error" onClick={onRetry} underline="hover" aria-live="assertive">
        Couldn&apos;t save — retry
      </Link>
    );
  }

  if (status === 'saved' && lastSavedAt !== null) {
    return (
      <Typography variant="caption" color="text.secondary" aria-live="polite">
        {formatSavedAgo(lastSavedAt, now)}
      </Typography>
    );
  }

  return null;
}

const StorefrontBuilder: React.FC = () => {
  const { site, registry: registryQuery, pages: pagesQuery, updateSections, refresh } = useBuilderData();

  const [pages, setPages] = useState<StorefrontPage[]>(() => clonePages(mockPages));
  const [activePageId, setActivePageId] = useState(mockPages[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(mockPages[0]?.sections[0]?.id ?? null);
  const [showValidation, setShowValidation] = useState(false);
  const [draftRevision, setDraftRevision] = useState<number | undefined>(undefined);

  const pagesRef = useRef(pages);
  const activePageIdRef = useRef(activePageId);
  const selectedSectionIdRef = useRef(selectedSectionId);
  pagesRef.current = pages;
  activePageIdRef.current = activePageId;
  selectedSectionIdRef.current = selectedSectionId;

  const registry: SectionRegistry = registryQuery.data ?? mockSectionRegistry;
  const hydratedRef = useRef(false);

  // One-shot hydrate from API (or fixtures). Later cache updates must not wipe local edits.
  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    if (!pagesQuery.isFetched && !registryQuery.isFetched) {
      return;
    }

    const nextSource = pagesQuery.data && pagesQuery.data.length > 0 ? pagesQuery.data : mockPages;
    const next = clonePages(nextSource);
    setPages(next);
    setActivePageId(next[0]?.id ?? '');
    setSelectedSectionId(next[0]?.sections[0]?.id ?? null);
    if (site.data?.draft_revision !== undefined) {
      setDraftRevision(site.data.draft_revision);
    }
    hydratedRef.current = true;
  }, [pagesQuery.isFetched, pagesQuery.data, registryQuery.isFetched, registryQuery.data, site.data?.draft_revision]);

  useEffect(() => {
    if (site.data?.draft_revision !== undefined && draftRevision === undefined) {
      setDraftRevision(site.data.draft_revision);
    }
  }, [site.data?.draft_revision, draftRevision]);

  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0], [pages, activePageId]);

  const selectedSection = useMemo(
    () => activePage?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [activePage, selectedSectionId]
  );

  const selectedSectionType = useMemo(
    () => (selectedSection ? (registry[selectedSection.type] ?? null) : null),
    [registry, selectedSection]
  );

  const getSections = useCallback(() => {
    const page = pagesRef.current.find((entry) => entry.id === activePageIdRef.current) ?? pagesRef.current[0];
    return page?.sections ?? [];
  }, []);

  const handleConflictReload = useCallback(async () => {
    await refresh();
    const [pagesResult, siteResult] = await Promise.all([pagesQuery.refetch(), site.refetch()]);
    const nextSource = pagesResult.data && pagesResult.data.length > 0 ? pagesResult.data : mockPages;
    const next = clonePages(nextSource);
    setPages(next);
    setActivePageId((current) => (next.some((page) => page.id === current) ? current : (next[0]?.id ?? '')));
    setSelectedSectionId((current) => {
      const pageForSelection = next.find((page) => page.sections.some((section) => section.id === current)) ?? next[0];
      if (pageForSelection?.sections.some((section) => section.id === current)) {
        return current;
      }
      return pageForSelection?.sections[0]?.id ?? null;
    });
    setDraftRevision(siteResult.data?.draft_revision);
  }, [pagesQuery, refresh, site]);

  const saveFn = useCallback(
    async (args: { pageId: string; data: UpdateSectionsPayload }) => updateSections.mutateAsync({ pageId: args.pageId, data: args.data }),
    [updateSections]
  );

  const { status, lastSavedAt, isDirty, hasConflict, scheduleSave, saveNow, retry, reload } = useAutosave({
    pageId: activePage?.id,
    getSections,
    draftRevision,
    onRevisionBump: setDraftRevision,
    saveFn,
    enabled: Boolean(activePage?.id) && draftRevision !== undefined,
    onConflictReload: handleConflictReload
  });

  const { push: pushUndoSnapshot, setUndoHandler } = useUndoStack<BuilderSnapshot>();

  useEffect(() => {
    setUndoHandler((snapshot) => {
      setPages(clonePages(snapshot.pages));
      setActivePageId(snapshot.activePageId);
      setSelectedSectionId(snapshot.selectedSectionId);
      scheduleSave();
    });
  }, [setUndoHandler, scheduleSave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty && status !== 'saving' && status !== 'error' && !hasConflict) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, status, hasConflict]);

  const pushUndo = useCallback(() => {
    pushUndoSnapshot({
      pages: clonePages(pagesRef.current),
      activePageId: activePageIdRef.current,
      selectedSectionId: selectedSectionIdRef.current
    });
  }, [pushUndoSnapshot]);

  const updateActivePage = useCallback((updater: (page: StorefrontPage) => StorefrontPage) => {
    setPages((current) => current.map((page) => (page.id === activePageIdRef.current ? updater(page) : page)));
  }, []);

  const handleToggleVisibility = (sectionId: string) => {
    pushUndo();
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }
        const nextVisible = !sectionIsVisible(section);
        return { ...section, is_visible: nextVisible };
      })
    }));
    scheduleSave();
  };

  const handleDuplicateSection = (sectionId: string) => {
    pushUndo();
    updateActivePage((page) => {
      const index = page.sections.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        return page;
      }

      const source = page.sections[index];
      const duplicate: StorefrontSection = {
        id: `${source.id}_copy_${Date.now()}`,
        type: source.type,
        fields: { ...source.fields },
        is_visible: source.is_visible
      };

      const sections = [...page.sections];
      sections.splice(index + 1, 0, duplicate);
      return { ...page, sections };
    });
    scheduleSave();
  };

  const handleDeleteSection = (sectionId: string) => {
    pushUndo();
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.filter((section) => section.id !== sectionId)
    }));
    setSelectedSectionId((current) => (current === sectionId ? null : current));
    scheduleSave();
  };

  const handleReorderSections = (orderedIds: string[]) => {
    pushUndo();
    updateActivePage((page) => ({
      ...page,
      sections: reorderSections(page.sections, orderedIds)
    }));
    saveNow();
  };

  const handleAddSection = () => {
    // Section picker modal lands in a later T2 step.
  };

  const handleFieldChange = (key: string, nextValue: unknown) => {
    if (!selectedSectionId) {
      return;
    }

    pushUndo();
    setShowValidation(true);
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              fields: {
                ...section.fields,
                [key]: nextValue as (typeof section.fields)[string]
              }
            }
          : section
      )
    }));
    scheduleSave();
  };

  const handleFieldBlur = () => {
    saveNow();
  };

  return (
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%', pr: 1 }}>
          <Typography component="span" variant="h4">
            Online Storefront
          </Typography>
          {!hasConflict ? <SaveStatusLabel status={status} lastSavedAt={lastSavedAt} onRetry={retry} /> : null}
        </Box>
      }
      contentSX={{ p: { xs: 1.5, md: 2 } }}
    >
      {hasConflict ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void reload()}>
              Reload
            </Button>
          }
        >
          This store was edited in another tab — reload to continue
        </Alert>
      ) : null}

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
              registry={registry}
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
                {sectionRailLabel(selectedSection, registry)}
              </Typography>
              {selectedSectionType.fields.map((field) => (
                <FieldEditorRenderer
                  key={field.key}
                  field={field}
                  value={selectedSection.fields[field.key] ?? field.default ?? null}
                  showValidation={showValidation}
                  onChange={(nextValue) => handleFieldChange(field.key, nextValue)}
                  onBlur={field.type === 'text' || field.type === 'richtext' ? handleFieldBlur : undefined}
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
