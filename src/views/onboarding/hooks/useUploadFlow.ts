// Sequential multi-file upload state machine. One file at a time: a single
// progress narrative, one 15-min ticket alive at a time, no interleaved GCS
// streams. The queue advances at 'waiting_job' (upload channel free), not at
// 'done' — job discovery rides the polled ['onboarding-state'] cache since
// POST /sources/ returns no job_id (the job exists only after the
// Eventarc → Cloud Function → ingest-callback round-trip).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { createUploadSource, reissueUploadTicket, uploadToGcs } from 'api/onboarding.api';
import type { OnboardingState, UploadTicket } from 'api/onboarding.api';
import { jobsForSource } from '../wizardState';
import { contentTypeForFile, isTicketExpired } from '../upload';

export type UploadItemStatus = 'queued' | 'ticketing' | 'uploading' | 'waiting_job' | 'done' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progressPct: number;
  sourceId?: string;
  jobId?: string;
  error?: string;
  waitingSince?: number; // epoch ms when the item entered waiting_job
}

const extractError = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
  }
  if (typeof error?.message === 'string' && error.message) return error.message;
  return fallback;
};

let itemSeq = 0;
const nextItemId = () => `upload-${Date.now()}-${itemSeq++}`;

export function useUploadFlow(state: OnboardingState | undefined): {
  items: UploadItem[];
  enqueue: (files: File[]) => void;
  retry: (itemId: string) => void;
  clearFinished: () => void;
  busy: boolean;
} {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const processingRef = useRef(false);
  const qc = useQueryClient();

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    const next = itemsRef.current.find((item) => item.status === 'queued');
    if (!next) return;
    processingRef.current = true;

    try {
      // 1. Ticket. A retried item already has a source — re-ticket it instead
      // of creating a duplicate DataSource (same object_path guaranteed).
      update(next.id, { status: 'ticketing' });
      let ticket: UploadTicket;
      try {
        ticket = next.sourceId
          ? await reissueUploadTicket(next.sourceId)
          : await createUploadSource(next.file.name, contentTypeForFile(next.file.name, next.file.type));
      } catch (error: any) {
        update(next.id, { status: 'error', error: extractError(error, 'Could not start the upload.') });
        return;
      }

      // 2. PUT to GCS with the signed headers echoed verbatim. On failure
      // (403 signature/expiry, network): ONE automatic re-ticket + retry —
      // never reuse a stale URL.
      update(next.id, { status: 'uploading', sourceId: ticket.source_id, progressPct: 0 });
      const put = (t: UploadTicket) =>
        uploadToGcs(t, next.file, (pct) => {
          update(next.id, { progressPct: pct });
        });
      try {
        if (isTicketExpired(ticket.expires_at, new Date())) {
          ticket = await reissueUploadTicket(ticket.source_id);
        }
        await put(ticket);
      } catch {
        try {
          ticket = await reissueUploadTicket(ticket.source_id);
          update(next.id, { progressPct: 0 });
          await put(ticket);
        } catch (error: any) {
          update(next.id, { status: 'error', error: extractError(error, 'Upload failed. Check your connection and retry.') });
          return;
        }
      }

      // 3. Wait for the ingest callback to create the job (observed via the
      // polled state cache — hasFreshPendingSource keeps that poll alive).
      update(next.id, { status: 'waiting_job', progressPct: 100, waitingSince: Date.now() });
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    } finally {
      processingRef.current = false;
    }
  }, [qc, update]);

  const processNextRef = useRef(processNext);
  processNextRef.current = processNext;

  // Kick the queue whenever a queued item exists and nothing is in flight.
  useEffect(() => {
    if (items.some((item) => item.status === 'queued')) {
      void processNextRef.current();
    }
  }, [items]);

  // Job discovery: match waiting items to jobs appearing for their source.
  useEffect(() => {
    if (!state) return;
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (item.status !== 'waiting_job' || !item.sourceId) return item;
        const jobs = jobsForSource(state, item.sourceId);
        if (jobs.length === 0) return item;
        changed = true;
        return { ...item, status: 'done' as const, jobId: jobs[0].id };
      });
      return changed ? next : prev;
    });
  }, [state]);

  const enqueue = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const newItems: UploadItem[] = files.map((file) => ({
      id: nextItemId(),
      file,
      status: 'queued',
      progressPct: 0
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const retry = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId && item.status === 'error' ? { ...item, status: 'queued', error: undefined, progressPct: 0 } : item
      )
    );
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.status !== 'done'));
  }, []);

  const busy = items.some((item) => item.status === 'queued' || item.status === 'ticketing' || item.status === 'uploading');

  return { items, enqueue, retry, clearFinished, busy };
}
