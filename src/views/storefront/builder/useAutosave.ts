import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type { StorefrontDraft, StorefrontSection, UpdateSectionsPayload } from 'types/storefront';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const AUTOSAVE_DEBOUNCE_MS = 1500;

type SaveFn = (args: { pageId: string; data: UpdateSectionsPayload }) => Promise<StorefrontDraft>;

type UseAutosaveOptions = {
  pageId: string | undefined;
  /** Latest sections for the active page (read at save time). */
  getSections: () => StorefrontSection[];
  draftRevision: number | undefined;
  /** Called with the server's revision after a successful save. */
  onRevisionBump: (nextRevision: number) => void;
  saveFn: SaveFn;
  enabled: boolean;
  /** Explicit reload after 409 — parent refetches and replaces local state. */
  onConflictReload: () => Promise<void>;
};

export function formatSavedAgo(lastSavedAt: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
  if (sec < 60) return `Saved · ${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `Saved · ${min}m ago`;
}

/**
 * Debounced + immediate draft save for the storefront builder.
 * On 409: sets hasConflict, keeps caller local state untouched.
 */
export function useAutosave({ pageId, getSections, draftRevision, onRevisionBump, saveFn, enabled, onConflictReload }: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingAfterFlightRef = useRef(false);
  const hasConflictRef = useRef(false);
  const draftRevisionRef = useRef(draftRevision);
  const pageIdRef = useRef(pageId);

  draftRevisionRef.current = draftRevision;
  pageIdRef.current = pageId;
  hasConflictRef.current = hasConflict;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async () => {
    const id = pageIdRef.current;
    const revision = draftRevisionRef.current;
    if (!enabled || !id || revision === undefined || hasConflictRef.current) {
      return;
    }

    if (inFlightRef.current) {
      pendingAfterFlightRef.current = true;
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');

    try {
      const draft = await saveFn({
        pageId: id,
        data: {
          sections: getSections(),
          draft_revision: revision
        }
      });
      onRevisionBump(draft.site.draft_revision);
      setLastSavedAt(Date.now());
      setStatus('saved');
      setIsDirty(false);
      setHasConflict(false);
      hasConflictRef.current = false;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        // Keep local edits; surface conflict. Do not clear pages.
        setHasConflict(true);
        hasConflictRef.current = true;
        setStatus('error');
        setIsDirty(true);
      } else {
        setStatus('error');
        setIsDirty(true);
      }
    } finally {
      inFlightRef.current = false;
      if (pendingAfterFlightRef.current && !hasConflictRef.current) {
        pendingAfterFlightRef.current = false;
        void performSave();
      } else {
        pendingAfterFlightRef.current = false;
      }
    }
  }, [enabled, getSections, onRevisionBump, saveFn]);

  const scheduleSave = useCallback(() => {
    if (!enabled || hasConflictRef.current) return;
    setIsDirty(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void performSave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [clearTimer, enabled, performSave]);

  const saveNow = useCallback(() => {
    if (!enabled || hasConflictRef.current) {
      if (!hasConflictRef.current) setIsDirty(true);
      return;
    }
    setIsDirty(true);
    clearTimer();
    void performSave();
  }, [clearTimer, enabled, performSave]);

  const retry = useCallback(() => {
    if (hasConflictRef.current) return;
    clearTimer();
    void performSave();
  }, [clearTimer, performSave]);

  const reload = useCallback(async () => {
    clearTimer();
    await onConflictReload();
    setHasConflict(false);
    hasConflictRef.current = false;
    setIsDirty(false);
    setStatus('idle');
    setLastSavedAt(null);
  }, [clearTimer, onConflictReload]);

  /** Shared save indicator for non-section writes (e.g. theme → updateSite). */
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const notifySaving = useCallback(() => {
    setStatus('saving');
    setIsDirty(true);
  }, []);

  const notifySaved = useCallback(() => {
    setLastSavedAt(Date.now());
    setStatus('saved');
    setIsDirty(false);
  }, []);

  const notifyError = useCallback((conflict = false) => {
    if (conflict) {
      setHasConflict(true);
      hasConflictRef.current = true;
    }
    setStatus('error');
    setIsDirty(true);
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    status,
    lastSavedAt,
    isDirty,
    hasConflict,
    scheduleSave,
    saveNow,
    retry,
    reload,
    markDirty,
    notifySaving,
    notifySaved,
    notifyError
  };
}
