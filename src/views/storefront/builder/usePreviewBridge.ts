import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storefrontAPI } from 'api/storefront.api';

/** iframe → builder */
export type PreviewReadyMessage = {
  source: 'allyvia-preview';
  type: 'preview-ready';
  v: 1;
};

/** builder → iframe */
export type BuilderPreviewMessage =
  | { source: 'allyvia-builder'; type: 'scroll-to-section'; sectionId: string; v: 1 }
  | { source: 'allyvia-builder'; type: 'section-hover-highlight'; sectionId: string | null; v: 1 }
  | { source: 'allyvia-builder'; type: 'draft-updated'; v: 1 };

function isPreviewReadyMessage(data: unknown): data is PreviewReadyMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return msg.source === 'allyvia-preview' && msg.type === 'preview-ready' && msg.v === 1;
}

function previewOriginOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export type UsePreviewBridgeOptions = {
  /** When set, appended as `?page=<id>` so the public preview shows this page. */
  pageId?: string | null;
};

/**
 * Builder half of the live-preview postMessage bridge.
 *
 * Origin allowlist is derived from the fetched preview URL (never `"*"`):
 * `https://{subdomain}.allyvia.shop` from `GET /storefront/preview-link/`.
 */
export function usePreviewBridge({ pageId = null }: UsePreviewBridgeOptions = {}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const queueRef = useRef<BuilderPreviewMessage[]>([]);
  const readyRef = useRef(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  const allowedOrigin = useMemo(() => previewOriginOf(previewUrl), [previewUrl]);

  const iframeSrc = useMemo(() => {
    if (!previewUrl) return null;
    if (!pageId) return previewUrl;
    try {
      const next = new URL(previewUrl);
      next.searchParams.set('page', pageId);
      return next.toString();
    } catch {
      return previewUrl;
    }
  }, [previewUrl, pageId]);

  const postToPreview = useCallback(
    (message: BuilderPreviewMessage) => {
      const origin = allowedOrigin;
      const win = iframeRef.current?.contentWindow;
      if (!origin || !win || !readyRef.current) {
        queueRef.current.push(message);
        return;
      }
      win.postMessage(message, origin);
    },
    [allowedOrigin]
  );

  const flushQueue = useCallback(() => {
    const origin = allowedOrigin;
    const win = iframeRef.current?.contentWindow;
    if (!origin || !win || !readyRef.current) return;
    const queued = queueRef.current;
    queueRef.current = [];
    queued.forEach((message) => win.postMessage(message, origin));
  }, [allowedOrigin]);

  const fetchPreviewLink = useCallback(async () => {
    setIsLoadingLink(true);
    setLinkError(null);
    readyRef.current = false;
    setIsPreviewReady(false);
    queueRef.current = [];
    try {
      const result = await storefrontAPI.getPreviewLink();
      setPreviewUrl(result.url);
      setExpiresIn(result.expires_in);
    } catch {
      setPreviewUrl(null);
      setExpiresIn(null);
      setLinkError("Couldn't load the preview link.");
    } finally {
      setIsLoadingLink(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreviewLink();
  }, [fetchPreviewLink]);

  // Changing the iframe document (page query) resets readiness until preview-ready.
  useEffect(() => {
    readyRef.current = false;
    setIsPreviewReady(false);
    queueRef.current = [];
  }, [iframeSrc]);

  useEffect(() => {
    if (!allowedOrigin) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) return;
      if (!isPreviewReadyMessage(event.data)) return;
      readyRef.current = true;
      setIsPreviewReady(true);
      flushQueue();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [allowedOrigin, flushQueue]);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      postToPreview({ source: 'allyvia-builder', type: 'scroll-to-section', sectionId, v: 1 });
    },
    [postToPreview]
  );

  const hoverSection = useCallback(
    (sectionId: string | null) => {
      postToPreview({ source: 'allyvia-builder', type: 'section-hover-highlight', sectionId, v: 1 });
    },
    [postToPreview]
  );

  const notifyDraftUpdated = useCallback(() => {
    postToPreview({ source: 'allyvia-builder', type: 'draft-updated', v: 1 });
  }, [postToPreview]);

  const openPreviewTab = useCallback(() => {
    if (!iframeSrc) return;
    window.open(iframeSrc, '_blank', 'noopener,noreferrer');
  }, [iframeSrc]);

  return {
    iframeRef,
    iframeSrc,
    previewUrl,
    expiresIn,
    allowedOrigin,
    isPreviewReady,
    isLoadingLink,
    linkError,
    scrollToSection,
    hoverSection,
    notifyDraftUpdated,
    openPreviewTab,
    refreshPreviewLink: fetchPreviewLink
  };
}
