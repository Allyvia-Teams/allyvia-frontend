// Inventory › Plan › one plan (design §10; the mockup is the visual source of truth). Five states (working.ts):
// empty → drop the line sheet; needs sizing → Re-size; working → the run's steps; failed → its sentence and
// Re-size; memo → the proposal beside the chat. The page owns every call; Memo, ItemCard and ChatRail draw.
//
// - Scope: `?location_id=` is sent as `X-Location-Id` on every call; the plan answers only under its store.
// - Polling: only `GET plans/<id>/`, every 2 s while a run is queued or running; the memo is read again when the
//   run ends (never polled).
// - Selection → chat: a clicked chunk, or every chunk a text selection touches, shows "Add to chat"; ⌘L / Ctrl L
//   does the same while the memo holds the selection and focus is not in a field.

import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconMessageCircle } from '@tabler/icons-react';

import {
  addCatalogueStyles,
  answerPriceColumn,
  ask,
  clearDecision,
  dropFiles,
  getMemo,
  getMemoPdf,
  getOrderPreview,
  getPlan,
  getVersions,
  patchLine,
  placeOrder,
  probeChat,
  recordDecision,
  runConfirm,
  startRun,
  type Citation,
  type OrderResult,
  type RunStatus
} from 'api/buying.api';
import { containerViewportOffset } from 'store/constant';

import { relativeApiPath } from '../apiPath';
import { chatReducer, citationTarget, confirmRequest, initialChat, isKillSwitch, turnContext } from '../chat';
import { serverSentence } from '../errors';
import { ownerMemoView, type CardView } from '../memo';
import { decisionBody, disagreement, recordError, recordOutcome, recordState } from '../record';
import { addChips, emptyChips, refreshChips, removeChip, selectedChunks } from '../selection';
import { chipText } from '../versions';
import { banner, countWords, fileIssues, pageState, readCounts } from '../working';
import CardActions from './CardActions';
import CataloguePicker from './CataloguePicker';
import ChatRail, { messageDomId } from './ChatRail';
import FileIssuesPanel from './FileIssuesPanel';
import LiveFacts from './LiveFacts';
import Memo, { COLLAPSED_ITEMS } from './Memo';
import OrderEndcap from './OrderEndcap';
import PlanDropZone from './PlanDropZone';
import ShareDialog from './ShareDialog';
import VersionsDrawer from './VersionsDrawer';
import WorkingLine from './WorkingLine';

const TraceExplorer = lazy(() => import('./TraceExplorer'));

const API_BASE: string = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1/';
const GOING: ReadonlySet<RunStatus> = new Set(['queued', 'running']);
const WIDE = 1140;
/** MainLayout's footer under the page (measured on the rig: 44 px), so the page fits the viewport and never scrolls. */
const FOOTER = 44;
const RAIL = 380;

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const isField = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

const dayWords = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/** Scroll to an element, focus it, and flash it (no motion when she has asked for none). */
const reveal = (domId: string) => {
  const el = document.getElementById(domId);
  if (!el) return false;
  const still = reducedMotion();
  el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  el.focus({ preventScroll: true });
  if (!still) {
    el.classList.add('plan-flash');
    window.setTimeout(() => el.classList.remove('plan-flash'), 1400);
  }
  return true;
};

const useWidth = () => {
  const [width, setWidth] = useState(0);
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { width, ref: setNode };
};

const PriceForm = ({ busy, onSave }: { busy: boolean; onSave: (price: string) => void }) => {
  const [price, setPrice] = useState('');
  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (price.trim()) onSave(price.trim());
      }}
      sx={{ display: 'flex', gap: 1, mt: 1 }}
    >
      <TextField
        size="small"
        label="Retail price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        sx={{ width: 140 }}
      />
      <Button type="submit" size="small" variant="outlined" disabled={busy || !price.trim()}>
        Save price
      </Button>
    </Box>
  );
};

export default function PlanPage() {
  const { planId = '' } = useParams();
  const [params] = useSearchParams();
  const locationId = params.get('location_id');
  const client = useQueryClient();
  const shortcut = isMac() ? '⌘L' : 'Ctrl L';

  // --- Reads -------------------------------------------------------------------------------------------------
  const planQuery = useQuery({
    queryKey: ['buy-plan', planId, locationId],
    queryFn: () => getPlan(planId, locationId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.data && GOING.has(q.state.data.plan.run.status) ? 2000 : false)
  });
  const plan = planQuery.data?.plan ?? null;
  const state = plan ? pageState(plan) : null;
  const memoQuery = useQuery({
    queryKey: ['buy-plan-memo', planId, locationId],
    queryFn: () => getMemo(planId, locationId),
    enabled: state === 'memo',
    retry: false,
    refetchOnWindowFocus: false
  });
  const live = memoQuery.data?.live ?? null;
  const orderQuery = useQuery({
    queryKey: ['buy-plan-order', planId, locationId],
    queryFn: () => getOrderPreview(planId, locationId),
    // buying/order.py ORDERABLE: an ordered plan still orders what its first order left out.
    enabled: state === 'memo' && !!live && ['draft', 'open', 'frozen', 'ordered'].includes(live.status),
    retry: false,
    refetchOnWindowFocus: false
  });
  const versionsQuery = useQuery({
    queryKey: ['buy-plan-versions', planId, locationId, 1],
    queryFn: () => getVersions(planId, 1, locationId),
    enabled: !!plan,
    retry: false,
    refetchOnWindowFocus: false
  });
  const chatProbe = useQuery({
    queryKey: ['buy-plan-ask', planId, locationId],
    queryFn: async () => {
      await probeChat(planId, locationId);
      return true;
    },
    enabled: state === 'memo',
    retry: false,
    staleTime: Infinity
  });

  const view = useMemo(() => (memoQuery.data && plan ? ownerMemoView(memoQuery.data, plan.lines, API_BASE) : null), [memoQuery.data, plan]);
  const lines = useMemo(() => new Map((plan?.lines ?? []).map((l) => [l.id, l])), [plan]);

  const invalidateAll = useCallback(() => {
    ['buy-plan', 'buy-plan-memo', 'buy-plan-versions', 'buy-plan-order', 'buy-plans'].forEach((k) =>
      client.invalidateQueries({ queryKey: [k] })
    );
  }, [client]);

  // When a run ends, read the memo and everything that follows from it again.
  const runStatus = plan?.run.status;
  const lastRun = useRef<RunStatus | undefined>(runStatus);
  useEffect(() => {
    const was = lastRun.current;
    lastRun.current = runStatus;
    if (was && GOING.has(was) && runStatus && !GOING.has(runStatus)) invalidateAll();
  }, [runStatus, invalidateAll]);

  // --- Local UI state ------------------------------------------------------------------------------------------
  const [showAll, setShowAll] = useState(false);
  const [seeOpen, setSeeOpen] = useState<Record<string, string | null>>({});
  const [busyLines, setBusyLines] = useState<ReadonlySet<string>>(new Set());
  const [lineMessage, setLineMessage] = useState<Record<string, { tone: 'info' | 'error'; text: string }>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [refusedOnDrop, setRefusedOnDrop] = useState<{ file: string; reason: string }[]>([]);
  const [picker, setPicker] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [chat, dispatch] = useReducer(chatReducer, undefined, initialChat);
  const [chips, setChips] = useState(emptyChips);
  const [railOpen, setRailOpen] = useState(false);
  const [selection, setSelection] = useState<{ anchors: string[]; rect: DOMRect } | null>(null);
  const [pendingReveal, setPendingReveal] = useState<string | null>(null);
  const revealTries = useRef(0);
  // A focus the page moves itself (a citation's reveal) is not her selection.
  const revealing = useRef(false);
  const chatInput = useRef<HTMLTextAreaElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const pane = useRef<HTMLDivElement | null>(null);
  const { width, ref: rootRef } = useWidth();
  const wide = width >= WIDE;

  useEffect(() => {
    if (!plan || !GOING.has(plan.run.status)) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [plan]);

  // A card asked for by a citation may be below the first eight, or behind the chat's drawer: reveal it after the
  // render that shows it; give up after a few renders when it never appears (a chunk the card does not draw).
  useEffect(() => {
    if (!pendingReveal) return;
    revealing.current = true;
    const found = reveal(pendingReveal);
    revealing.current = false;
    revealTries.current += 1;
    if (found || revealTries.current > 3) {
      setPendingReveal(null);
      revealTries.current = 0;
    }
  }, [pendingReveal, showAll, seeOpen, railOpen]);

  // Record is enabled only when a card and its line agree; when they do not, read both again, once per state of
  // disagreement (a disagreement that persists is read once, never in a loop), and never while a run moves them.
  const tried = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!view || !live || !plan || GOING.has(plan.run.status)) return;
    const key = disagreement(view, lines, live);
    if (!key || tried.current.has(key)) return;
    tried.current.add(key);
    client.invalidateQueries({ queryKey: ['buy-plan', planId] });
    client.invalidateQueries({ queryKey: ['buy-plan-memo', planId] });
  }, [view, live, lines, plan]);

  // A re-size writes new trace ids: the chips follow their lines into the new memo.
  useEffect(() => {
    if (view) setChips((current) => refreshChips(current, view));
  }, [view]);

  const isBusy = (id: string) => busyLines.has(id);
  const setBusy = (id: string, on: boolean) =>
    setBusyLines((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // --- Calls ----------------------------------------------------------------------------------------------------
  const lineCall = async (lineId: string, call: () => Promise<unknown>, done?: string) => {
    setBusy(lineId, true);
    setLineMessage((m) => {
      const next = { ...m };
      delete next[lineId];
      return next;
    });
    try {
      await call();
      if (done) setLineMessage((m) => ({ ...m, [lineId]: { tone: 'info', text: done } }));
      invalidateAll();
    } catch (error) {
      setLineMessage((m) => ({ ...m, [lineId]: { tone: 'error', text: serverSentence(error, 'That did not save. Try again.') } }));
      if ((error as { response?: { status?: number } })?.response?.status === 409) invalidateAll();
    } finally {
      setBusy(lineId, false);
    }
  };

  const onRecord = async (card: CardView, qty: string, note: string) => {
    if (!card.lineId || !live) return;
    const lineId = card.lineId;
    const rs = recordState(card, lines.get(lineId), live);
    const body = decisionBody(qty, note, rs.againstRevision);
    if (!body.ok) {
      setLineMessage((m) => ({ ...m, [lineId]: { tone: 'error', text: body.error } }));
      return;
    }
    setBusy(lineId, true);
    try {
      const result = await recordDecision(planId, lineId, body.body, locationId);
      setLineMessage((m) => ({ ...m, [lineId]: { tone: 'info', text: recordOutcome(result) } }));
      invalidateAll();
    } catch (error) {
      const refusal = recordError(error);
      setLineMessage((m) => ({ ...m, [lineId]: { tone: 'error', text: refusal.sentence } }));
      if (refusal.refetch) invalidateAll();
    } finally {
      setBusy(lineId, false);
    }
  };

  const resize = async () => {
    setPageError(null);
    try {
      await startRun(planId, locationId);
      client.invalidateQueries({ queryKey: ['buy-plan', planId] });
    } catch (error) {
      setPageError(serverSentence(error, 'The plan could not be re-sized. Try again.'));
    }
  };

  /** True when the server took the drop (her picked files are kept on a failure, so she need not find them again). */
  const drop = async (files: File[]): Promise<boolean> => {
    setUploading(true);
    setProgress(null);
    setPageError(null);
    try {
      const result = await dropFiles(planId, files, locationId, (e) =>
        setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null)
      );
      // A 400 refusing the whole drop is `{detail}` only (buying/intake.py IntakeRefused), not a DropResult.
      if (!Array.isArray(result?.files)) {
        setPageError(serverSentence({ response: { status: 400, data: result } }, 'The files could not be read. Try again.'));
        return false;
      }
      setRefusedOnDrop(result.refused || []);
      invalidateAll();
      return true;
    } catch (error) {
      setPageError(serverSentence(error, 'The files could not be sent. Try again.'));
      return false;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const priceMeans = async (fileId: string, means: 'retail' | 'wholesale') => {
    setUploading(true);
    try {
      await answerPriceColumn(planId, fileId, means, locationId);
      invalidateAll();
    } catch (error) {
      setPageError(serverSentence(error, 'That did not save. Try again.'));
    } finally {
      setUploading(false);
    }
  };

  const [adding, setAdding] = useState(false);
  const addStyles = async (ids: string[]): Promise<boolean> => {
    setPickerError(null);
    setAdding(true);
    try {
      await addCatalogueStyles(planId, ids, locationId);
      setPicker(false);
      invalidateAll();
      return true;
    } catch (error) {
      setPickerError(serverSentence(error, 'Those styles could not be added. Try again.'));
      return false;
    } finally {
      setAdding(false);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    setPageError(null);
    setExporting(true);
    try {
      const blob = await getMemoPdf(planId, locationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        (plan?.name || 'plan')
          .replace(/[^A-Za-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase() || 'plan'
      }-memo.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      let sentence = 'The PDF could not be made. Try again.';
      const data = (error as { response?: { data?: unknown } })?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (typeof parsed?.detail === 'string') sentence = parsed.detail;
        } catch {
          /* not JSON: keep ours */
        }
      } else sentence = serverSentence(error, sentence);
      setPageError(sentence);
    } finally {
      setExporting(false);
    }
  };

  const order = async () => {
    setOrdering(true);
    setOrderError(null);
    try {
      setOrderResult(await placeOrder(planId, locationId));
      invalidateAll();
    } catch (error) {
      setOrderError(serverSentence(error, 'The draft POs could not be made. Try again.'));
      invalidateAll();
    } finally {
      setOrdering(false);
    }
  };

  const unlink = async (path: string) => {
    const url = relativeApiPath(path, API_BASE, planId);
    if (!url) return;
    setBusy('unlink', true);
    try {
      await runConfirm({ method: 'POST', url, data: {} }, locationId);
      invalidateAll();
    } catch (error) {
      setPageError(serverSentence(error, 'That could not be unlinked. Try again.'));
    } finally {
      setBusy('unlink', false);
    }
  };

  // --- Chat -----------------------------------------------------------------------------------------------------
  const send = async (text: string) => {
    dispatch({ type: 'sent', text, chips: chips.chips.map((c) => c.label) });
    try {
      const answer = await ask(
        planId,
        { message: text, context: turnContext(chips.chips), ...(chat.conversationId ? { conversation_id: chat.conversationId } : {}) },
        locationId
      );
      // Her recorded notes, so a card confirmed as written never erases hers.
      const notes = Object.fromEntries(
        (planQuery.data?.plan.lines ?? []).filter((l) => l.decision?.note).map((l) => [l.id, l.decision!.note])
      );
      dispatch({ type: 'answered', answer, notes });
    } catch (error) {
      dispatch({ type: 'failed', error });
    }
  };

  const confirm = async (localId: string, index: number, which: 'confirm' | 'record') => {
    const card = chat.messages.find((m) => m.localId === localId)?.cards[index];
    if (!card) return;
    const request = confirmRequest(card.card, card.note, API_BASE, planId, which);
    dispatch({ type: 'confirming', localId, index });
    if (!request) {
      dispatch({
        type: 'confirmFailed',
        localId,
        index,
        error: { response: { status: 409, data: { code: 'closed', detail: 'This change cannot be made from this page.' } } }
      });
      return;
    }
    try {
      await runConfirm(request, locationId);
      dispatch({ type: 'confirmed', localId, index });
      invalidateAll();
    } catch (error) {
      dispatch({ type: 'confirmFailed', localId, index, error });
    }
  };

  const cite = (citation: Citation, fromLocalId: string) => {
    if (!view) return;
    const target = citationTarget(citation, view, chat.messages, fromLocalId);
    if (!target) return;
    if (target.kind === 'rail' || target.kind === 'message') {
      reveal(messageDomId(target.localId));
      return;
    }
    // The memo is behind the chat's drawer in the narrow layout: close it first (it stays mounted), then reveal.
    if (!wide) setRailOpen(false);
    revealTries.current = 0;
    if (target.kind === 'card') {
      setSeeOpen((s) => ({ ...s, [target.cardKey]: target.openKey }));
      const index = view.items.findIndex((c) => c.key === target.cardKey);
      if (index >= COLLAPSED_ITEMS) setShowAll(true);
      setPendingReveal(target.domId);
      return;
    }
    const anchor = Object.values(view.anchors).find((a) => a.domId === target.domId);
    const index = anchor?.cardKey ? view.items.findIndex((c) => c.key === anchor.cardKey) : -1;
    if (index >= COLLAPSED_ITEMS) setShowAll(true);
    setPendingReveal(target.domId);
  };

  // --- Selection → chat -----------------------------------------------------------------------------------------
  /** What the memo holds now: the chunks a text selection inside it touches, else a focused chunk; null otherwise.
   * Read live, never from state, so a selection she has left behind never arms ⌘L / Ctrl L. */
  const currentSelection = useCallback((): { anchors: string[]; rect: DOMRect } | null => {
    const root = pane.current;
    if (!root) return null;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount && root.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const anchors = Array.from(root.querySelectorAll<HTMLElement>('[data-anchor]'))
        .filter((el) => range.intersectsNode(el))
        .map((el) => el.dataset.anchor as string);
      if (anchors.length) return { anchors, rect: range.getBoundingClientRect() };
    }
    const active = document.activeElement as HTMLElement | null;
    if (active && root.contains(active) && active.dataset.anchor) {
      return { anchors: [active.dataset.anchor], rect: active.getBoundingClientRect() };
    }
    return null;
  }, []);

  const readSelection = useCallback(() => {
    if (revealing.current) return;
    setSelection(currentSelection());
  }, [currentSelection]);

  const addToChat = useCallback(
    (held?: { anchors: string[] } | null) => {
      const from = held ?? selection;
      if (!view || !from) return;
      setChips((current) => addChips(current, selectedChunks(view, from.anchors), view));
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      if (!wide) setRailOpen(true);
      // Her next move is the question: the chat's input (the drawer's, once it has opened).
      window.setTimeout(() => chatInput.current?.focus(), wide ? 0 : 250);
    },
    [view, selection, wide]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'l') return;
      if (isField(document.activeElement)) return;
      const held = currentSelection();
      if (!held) return;
      e.preventDefault();
      addToChat(held);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentSelection, addToChat]);

  const onPaneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Escape') {
      setSelection(null);
      return;
    }
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !target.dataset.anchor || !pane.current) return;
    const all = Array.from(pane.current.querySelectorAll<HTMLElement>('[data-anchor]'));
    const at = all.indexOf(target);
    const next = all[at + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    all.forEach((el) => el.setAttribute('tabindex', '-1'));
    next.setAttribute('tabindex', '0');
    next.focus();
  };

  // --- Render ---------------------------------------------------------------------------------------------------
  if (planQuery.isLoading) return <Skeleton variant="rounded" height={320} />;
  // Only a plan never read replaces the page; a failed refetch keeps what she has (a Retry sits above it).
  if (!plan) {
    const status = (planQuery.error as { response?: { status?: number } })?.response?.status;
    return (
      <Alert severity="info">
        {status === 404 && !locationId
          ? `${serverSentence(planQuery.error, 'Not found.')} Open the plan from its store's list.`
          : serverSentence(planQuery.error, 'The plan could not be read. Try again.')}
      </Alert>
    );
  }

  const windowWords = `${dayWords(plan.window_start)} – ${dayWords(plan.window_end)}`;
  const live_ = live;
  const editable = plan.status === 'draft' || plan.status === 'open';
  const issues = fileIssues(plan.files, refusedOnDrop);
  const counts = countWords(readCounts(plan.files));
  const top = banner(plan, windowWords);
  const chosen = new Set(chips.chips.map((c) => c.anchor));
  // Only the kill switch (a 404 from GET ask/) switches the chat off; a blip leaves it on (an ask says its own error).
  const offline = chatProbe.isError && isKillSwitch(chatProbe.error) ? 'The assistant is not switched on here.' : null;
  const names = Object.fromEntries(plan.lines.map((l) => [l.id, l.name]));
  const listHref = `/inventory/plan${locationId ? `?location_id=${locationId}` : ''}`;

  const slotsFor = (card: CardView) => {
    if (!card.lineId || !live_) return {};
    const lineId = card.lineId;
    const rs = recordState(card, lines.get(lineId), live_);
    const traceId = card.why?.citable && 'trace_id' in card.why.citable ? card.why.citable.trace_id : null;
    const open = Object.prototype.hasOwnProperty.call(seeOpen, card.key);
    return {
      actions: (
        <CardActions
          card={card}
          record={rs}
          busy={isBusy(lineId)}
          message={lineMessage[lineId] ?? null}
          canEdit={live_.actions.edit}
          canSee={Boolean(traceId)}
          seeOpen={open}
          onRecord={(qty, note) => onRecord(card, qty, note)}
          onUseOurs={() => lineCall(lineId, () => clearDecision(planId, lineId, locationId), 'The order uses ours again.')}
          onExclude={() => lineCall(lineId, () => patchLine(planId, lineId, { excluded: true }, locationId))}
          onSeeNumbers={() =>
            setSeeOpen((s) => {
              const next = { ...s };
              if (open) delete next[card.key];
              else next[card.key] = null;
              return next;
            })
          }
        />
      ),
      trace:
        open && traceId ? (
          <Suspense fallback={<Skeleton variant="rounded" height={120} sx={{ mt: 1.5 }} />}>
            <TraceExplorer traceId={traceId} locationId={locationId} openKey={seeOpen[card.key]} />
          </Suspense>
        ) : null,
      priceSlot:
        card.status === 'needs_price' && live_.actions.edit ? (
          <PriceForm
            busy={isBusy(lineId)}
            onSave={(price) => lineCall(lineId, () => patchLine(planId, lineId, { intended_price: price }, locationId))}
          />
        ) : null,
      facts: null
    };
  };

  const rail = (
    <ChatRail
      state={chat}
      chips={chips}
      offline={offline}
      shortcutLabel={shortcut}
      onRemoveChip={(anchor) => setChips((c) => removeChip(c, anchor))}
      onSend={send}
      onCite={cite}
      onConfirm={confirm}
      onDismiss={(localId, index) => dispatch({ type: 'dismissed', localId, index })}
      onNote={(localId, index, note) => dispatch({ type: 'note', localId, index, note })}
      onClose={wide ? undefined : () => setRailOpen(false)}
      inputRef={chatInput}
    />
  );

  const body = (() => {
    if (state === 'empty' || state === 'needs_sizing') {
      return (
        <Stack spacing={2.5}>
          <Box>
            <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {state === 'empty' ? 'Plan your next buy' : plan.name}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {plan.location.name} · order by {dayWords(plan.target_date)} · selling {windowWords}
            </Typography>
          </Box>
          {state === 'needs_sizing' ? (
            <Alert
              severity="info"
              action={
                editable ? (
                  <Button color="inherit" size="small" onClick={resize}>
                    Re-size
                  </Button>
                ) : undefined
              }
            >
              {plan.lines.length} item{plan.lines.length === 1 ? '' : 's'} waiting to be sized
              {plan.needs_price.length ? `, ${plan.needs_price.length} without a retail price` : ''}. Re-size when you have added
              everything.
            </Alert>
          ) : null}
          <FileIssuesPanel issues={issues} busy={uploading} onPriceMeans={priceMeans} />
          {editable ? <PlanDropZone uploading={uploading} progress={progress} compact={state === 'needs_sizing'} onSubmit={drop} /> : null}
          {editable ? (
            <Box>
              <Button variant="text" onClick={() => setPicker(true)}>
                Add styles you already carry
              </Button>
            </Box>
          ) : null}
          {state === 'needs_sizing' && plan.lines.length ? (
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: '20px' }}>
              {plan.lines.map((l) => (
                <li key={l.id}>
                  {l.name}
                  {l.needs_price ? (
                    <Typography component="span" color="text.secondary">
                      {' '}
                      · needs a price
                    </Typography>
                  ) : null}
                  {/* A line with no retail price is never sized: her price is the only way forward. */}
                  {l.needs_price && editable ? (
                    <PriceForm
                      busy={isBusy(l.id)}
                      onSave={(price) => lineCall(l.id, () => patchLine(planId, l.id, { intended_price: price }, locationId))}
                    />
                  ) : null}
                  {lineMessage[l.id] ? (
                    <Typography variant="caption" color={lineMessage[l.id].tone === 'error' ? 'error' : 'text.secondary'} component="div">
                      {lineMessage[l.id].text}
                    </Typography>
                  ) : null}
                </li>
              ))}
            </Stack>
          ) : null}
        </Stack>
      );
    }
    if (state === 'working') {
      return (
        <Stack spacing={2.5}>
          <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {plan.name}
          </Typography>
          <WorkingLine run={plan.run} windowWords={windowWords} counts={counts} now={now} />
          <FileIssuesPanel issues={issues} busy={uploading} onPriceMeans={priceMeans} />
        </Stack>
      );
    }
    if (state === 'failed') {
      return (
        <Stack spacing={2}>
          <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {plan.name}
          </Typography>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={resize}>
                Re-size
              </Button>
            }
          >
            {plan.run.error || 'Sizing failed.'}
          </Alert>
          <FileIssuesPanel issues={issues} busy={uploading} onPriceMeans={priceMeans} />
        </Stack>
      );
    }
    if (memoQuery.isLoading || !view) {
      return memoQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => memoQuery.refetch()}>
              Retry
            </Button>
          }
        >
          {serverSentence(memoQuery.error, 'The memo could not be read. Try again.')}
        </Alert>
      ) : (
        <Skeleton variant="rounded" height={480} />
      );
    }
    return (
      <Memo
        view={view}
        chosen={chosen}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
        slotsFor={slotsFor}
        excludedAction={
          live_?.actions.edit
            ? (lineId) => (
                <Button
                  size="small"
                  onClick={() => lineCall(lineId, () => patchLine(planId, lineId, { excluded: false }, locationId))}
                  disabled={isBusy(lineId)}
                >
                  Include
                </Button>
              )
            : undefined
        }
        liveFacts={live_ ? <LiveFacts live={live_} names={names} busy={isBusy('unlink')} onUnlink={unlink} /> : null}
        endcap={
          orderQuery.isFetched || orderQuery.isError ? (
            <OrderEndcap
              preview={orderQuery.data?.order ?? null}
              previewError={orderQuery.isError ? serverSentence(orderQuery.error, 'The order could not be read.') : null}
              result={orderResult}
              error={orderError}
              busy={ordering}
              onPlace={order}
            />
          ) : null
        }
      />
    );
  })();

  const versionsChip = versionsQuery.data ? chipText(versionsQuery.data, new Date(), browserZone()) : 'Changes';

  return (
    <Box
      ref={rootRef}
      sx={{ height: `calc(100vh - ${containerViewportOffset + FOOTER}px)`, display: 'flex', flexDirection: 'column', minHeight: 480 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pb: 1.5 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ flex: 1, minWidth: 0 }}>
          <Link component={RouterLink} to="/inventory" underline="hover" color="inherit">
            Inventory
          </Link>
          <Link component={RouterLink} to={listHref} underline="hover" color="inherit">
            Plan
          </Link>
          <Typography color="text.primary" noWrap>
            {plan.name}
          </Typography>
        </Breadcrumbs>
        <Button size="small" variant="text" onClick={() => setVersionsOpen(true)} aria-label={`Show changes: ${versionsChip}`}>
          {versionsChip}
        </Button>
        {state === 'memo' ? (
          <>
            <Button size="small" variant="outlined" onClick={exportPdf} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button size="small" variant="outlined" onClick={() => setShareOpen(true)}>
              Share
            </Button>
            {editable ? (
              <Button size="small" variant="outlined" onClick={resize} disabled={GOING.has(plan.run.status)}>
                Re-size
              </Button>
            ) : null}
            {!wide ? (
              <Button size="small" variant="contained" startIcon={<IconMessageCircle size={16} />} onClick={() => setRailOpen(true)}>
                Ask{chips.chips.length ? ` (${chips.chips.length})` : ''}
              </Button>
            ) : null}
          </>
        ) : null}
      </Box>

      {planQuery.isError || (memoQuery.isError && view) ? (
        <Alert
          severity="warning"
          sx={{ mb: 1.5 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                planQuery.refetch();
                if (state === 'memo') memoQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          This page could not be brought up to date. What you see may be behind.
        </Alert>
      ) : null}
      {pageError ? (
        <Alert severity="error" onClose={() => setPageError(null)} sx={{ mb: 1.5 }}>
          {pageError}
        </Alert>
      ) : null}
      {state === 'memo' && top ? (
        <Alert
          severity={top.kind === 'failed' ? 'error' : top.kind === 'stale' ? 'warning' : 'info'}
          sx={{ mb: 1.5 }}
          action={
            top.resize && editable ? (
              <Button color="inherit" size="small" onClick={resize}>
                Re-size
              </Button>
            ) : undefined
          }
        >
          {top.text}
        </Alert>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <Box
          ref={pane}
          onMouseUp={readSelection}
          onKeyUp={readSelection}
          onFocus={readSelection}
          onBlur={(e) => {
            // Leaving the memo leaves its selection behind (the pill closes; ⌘L is the browser's again).
            if (!pane.current?.contains(e.relatedTarget as Node | null)) setSelection(null);
          }}
          onScroll={() => selection && setSelection(null)}
          onKeyDown={onPaneKeyDown}
          sx={{ flex: 1, minWidth: 0, overflowY: 'auto', bgcolor: 'background.default' }}
        >
          <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>{body}</Box>
        </Box>
        {state === 'memo' && wide ? <Box sx={{ width: RAIL, flexShrink: 0, minHeight: 0 }}>{rail}</Box> : null}
      </Box>

      {state === 'memo' && !wide ? (
        <Drawer
          anchor="right"
          open={railOpen}
          onClose={() => setRailOpen(false)}
          // Kept mounted: closing the drawer to look at a citation never throws away what she was typing.
          ModalProps={{ keepMounted: true }}
          slotProps={{ paper: { sx: { width: { xs: '100%', sm: RAIL } } } }}
        >
          {rail}
        </Drawer>
      ) : null}

      <Popper
        open={Boolean(selection) && state === 'memo'}
        placement="top"
        anchorEl={selection ? { getBoundingClientRect: () => selection.rect } : null}
      >
        <Paper elevation={4} sx={{ p: 0.5, borderRadius: '999px' }}>
          <Button size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => addToChat()} sx={{ borderRadius: '999px' }}>
            Add to chat · {shortcut}
          </Button>
        </Paper>
      </Popper>

      <CataloguePicker open={picker} busy={adding} error={pickerError} onClose={() => setPicker(false)} onAdd={addStyles} />
      <VersionsDrawer open={versionsOpen} onClose={() => setVersionsOpen(false)} planId={planId} locationId={locationId} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        planId={planId}
        locationId={locationId}
        canShare={Boolean(live_?.actions.share)}
      />
    </Box>
  );
}
