// The recommendation cards' controller, extracted from InsightsPage (I2): the
// load, dismissals with undo, the acted-on set, the rationale panels and their
// detail cache, and every handler the cards take. InsightsPage and the
// Inventory page's Today tab both render RecommendationCard through it, so the
// two surfaces cannot drift in how a dismissal is sent or a panel is opened.
//
// The data comes through `source`, never from adapter.ts directly: /insights
// reads getInsights (which honours VITE_INSIGHTS_REDESIGN), Today reads the
// inventory sector's live rows whatever the flag says. `primary` lets a surface
// run its own flow for a card (Today drafts a purchase order from a reorder
// suggestion) before actions.ts's generic one.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import { actOnRecommendation } from './actions';
import { askAboutInsight, INSIGHT_CHAT } from './askAbout';
import {
  INITIAL_DISMISS_STATE,
  runDismissAction,
  type DismissAction,
  type DismissReason,
  type FinalDismissal,
  type PendingDismissal
} from './dismissals';
import { closeRationale, createDetailCache, toggleOpen, type DetailLoad, type InsightDetail } from './rationale';
import type { InsightsPayload, Recommendation } from './types';
import { readVisitRecord, recordActed, recordDismissed, sessionStore } from './visitRecord';

export type CardsLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; payload: InsightsPayload };

export interface RecommendationCardsSource {
  fetchPayload: () => Promise<InsightsPayload>;
  fetchDetail: (id: string) => Promise<InsightDetail>;
  dismiss: (id: string, reason?: string) => Promise<void>;
  /** Runs instead of actions.ts's flow when it returns true; default none. */
  primary?: (rec: Recommendation) => Promise<boolean>;
}

export interface RecommendationCardsState {
  load: CardsLoad;
  dismissedIds: string[];
  pendingDismissal: PendingDismissal | null;
  actedIds: string[];
  openIds: string[];
  details: Record<string, DetailLoad>;
  askAvailable: boolean;
  retry: () => void;
  onPrimary: (rec: Recommendation) => void;
  onDismiss: (rec: Recommendation, viaKeyboard: boolean) => void;
  onDismissReason: (reason: DismissReason | null) => void;
  onUndo: () => void;
  onCommitDismissal: (id: string) => void;
  onRationale: (id: string) => void;
  onRetryDetail: (id: string) => void;
  onAsk: (rec: Recommendation) => void;
}

const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])];

export default function useRecommendationCards(source: RecommendationCardsSource): RecommendationCardsState {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  // The source's functions are read through a ref so a caller may pass fresh
  // closures on every render without re-running the load.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const [load, setLoad] = useState<CardsLoad>({ status: 'loading' });
  // The loaded payload's refreshedAt: the visit record's key.
  const refreshedAtRef = useRef<string | null>(null);
  const [dismissal, setDismissal] = useState(INITIAL_DISMISS_STATE);
  // The latest state for event handlers and the unmount cleanup, so a
  // dismissal is never decided from a stale render.
  const dismissalRef = useRef(dismissal);
  const [actedIds, setActedIds] = useState<string[]>([]);
  // Rationale panels: open state is page-local and never persisted; details
  // are cached per id for the page's lifetime (rationale.ts).
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, DetailLoad>>({});
  const detailsRef = useRef(details);
  const detailCache = useRef(createDetailCache((id) => sourceRef.current.fetchDetail(id))).current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Send one final dismissal. The card is already gone; a failure is logged, not shown (see data-spec 4.1). */
  const sendDismissal = useCallback(({ id, reason }: FinalDismissal) => {
    sourceRef.current.dismiss(id, reason ?? undefined).catch((error: unknown) => {
      console.warn(`[insights-redesign] dismissInsight(${id}) failed`, error);
    });
  }, []);

  /** Send a final dismissal and write it to this visit's record, so /insights/history and a return visit see it. */
  const finalizeDismissal = useCallback(
    (dismissalToSend: FinalDismissal) => {
      sendDismissal(dismissalToSend);
      if (refreshedAtRef.current !== null) recordDismissed(sessionStore(), refreshedAtRef.current, dismissalToSend);
    },
    [sendDismissal]
  );

  const fetchCards = useCallback(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    sourceRef.current
      .fetchPayload()
      .then((payload) => {
        if (cancelled) return;
        // Coming back from an action's flow: restore this visit's dismissed and acted-on cards.
        const known = new Set(payload.recommendations.map((rec) => rec.id));
        const record = readVisitRecord(sessionStore(), payload.refreshedAt);
        const restoredDismissed = record.dismissed.map((e) => e.id).filter((id) => known.has(id));
        const restoredActed = record.acted.map((e) => e.id).filter((id) => known.has(id));
        refreshedAtRef.current = payload.refreshedAt;
        dismissalRef.current = { ...dismissalRef.current, dismissedIds: union(dismissalRef.current.dismissedIds, restoredDismissed) };
        setDismissal(dismissalRef.current);
        setActedIds((current) => union(current, restoredActed));
        setLoad({ status: 'ready', payload });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('[insights-redesign] fetchPayload failed', error);
        setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchCards(), [fetchCards]);

  const dispatchDismissal = useCallback(
    (action: DismissAction) => {
      const next = runDismissAction(dismissalRef.current, action, finalizeDismissal);
      dismissalRef.current = next;
      setDismissal(next);
    },
    [finalizeDismissal]
  );

  // Leaving the page with a toast open makes that dismissal final, as a timeout would.
  useEffect(
    () => () => {
      const { pending } = dismissalRef.current;
      if (pending) finalizeDismissal(pending);
    },
    [finalizeDismissal]
  );

  const setDetail = useCallback((id: string, detailLoad: DetailLoad) => {
    if (!mounted.current) return;
    detailsRef.current = { ...detailsRef.current, [id]: detailLoad };
    setDetails(detailsRef.current);
  }, []);

  const loadDetail = useCallback(
    (id: string) => {
      setDetail(id, { status: 'loading' });
      detailCache
        .get(id)
        .then((detail) => setDetail(id, { status: 'ready', detail }))
        .catch((error: unknown) => {
          console.warn(`[insights-redesign] getInsightDetail(${id}) failed`, error);
          setDetail(id, { status: 'error' });
        });
    },
    [detailCache, setDetail]
  );

  const onRationale = (id: string) => {
    const opening = !openIds.includes(id);
    setOpenIds((current) => toggleOpen(current, id));
    const known = detailsRef.current[id];
    // First expand fetches; a failed fetch is tried again on re-expand. A loaded or loading one is left alone.
    if (opening && (!known || known.status === 'error')) loadDetail(id);
  };

  const markActed = (id: string) => {
    if (mounted.current) setActedIds((current) => union(current, [id]));
  };

  // The surface's own flow first (true = handled: recorded and marked acted
  // on); otherwise the card's generic flow, where anything but coming_soon
  // marks it acted on (actions.ts).
  // One run per card at a time: a second click (or "Open again" while the
  // first is still in flight) must not send a second write.
  const inFlight = useRef(new Set<string>());
  const onPrimary = (rec: Recommendation) => {
    if (inFlight.current.has(rec.id)) return;
    inFlight.current.add(rec.id);
    const primary = sourceRef.current.primary;
    (primary ? primary(rec) : Promise.resolve(false))
      .then((handled) => {
        if (handled) {
          if (refreshedAtRef.current !== null) recordActed(sessionStore(), refreshedAtRef.current, rec.id);
          markActed(rec.id);
          return undefined;
        }
        return actOnRecommendation(rec, {
          navigate,
          notify: (message) => enqueueSnackbar(message, { variant: 'info' }),
          storage: sessionStore(),
          refreshedAt: refreshedAtRef.current,
          onActed: markActed
        });
      })
      .catch((error: unknown) => console.warn(`[insights-redesign] primary action for ${rec.id} failed`, error))
      .finally(() => inFlight.current.delete(rec.id));
  };

  return {
    load,
    dismissedIds: dismissal.dismissedIds,
    pendingDismissal: dismissal.pending,
    actedIds,
    openIds,
    details,
    askAvailable: INSIGHT_CHAT !== null,
    retry: () => {
      fetchCards();
    },
    onPrimary,
    onDismiss: (rec, viaKeyboard) => {
      // Undo brings the card back collapsed.
      setOpenIds((current) => closeRationale(current, rec.id));
      dispatchDismissal({ type: 'dismiss', rec, focusUndo: viaKeyboard });
    },
    onDismissReason: (reason) => dispatchDismissal({ type: 'reason', reason }),
    onUndo: () => dispatchDismissal({ type: 'undo' }),
    onCommitDismissal: (id) => dispatchDismissal({ type: 'commit', id }),
    onRationale,
    onRetryDetail: loadDetail,
    onAsk: (rec) => {
      askAboutInsight(rec);
    }
  };
}
