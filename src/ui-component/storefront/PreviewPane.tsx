import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export const PREVIEW_DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390
};

export type PreviewPaneProps = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  src: string | null;
  isPreviewReady: boolean;
  isLoadingLink?: boolean;
  linkError?: string | null;
  onRetryLink?: () => void;
};

/**
 * Live storefront preview frame: device widths 1280 / 834 / 390 with zoom-to-fit.
 */
const PreviewPane: React.FC<PreviewPaneProps> = ({
  iframeRef,
  src,
  isPreviewReady,
  isLoadingLink = false,
  linkError = null,
  onRetryLink
}) => {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [paneSize, setPaneSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const update = () => {
      setPaneSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const deviceWidth = PREVIEW_DEVICE_WIDTHS[device];
  const scale = paneSize.width > 0 ? Math.min(1, paneSize.width / deviceWidth) : 1;
  const frameHeight = paneSize.height > 0 ? Math.max(480, paneSize.height / scale) : 720;

  const showFrame = Boolean(src) && !linkError;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280, minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 1, flexShrink: 0 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Live preview
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={device}
          onChange={(_event, next: PreviewDevice | null) => {
            if (next) setDevice(next);
          }}
          aria-label="Preview device width"
        >
          <ToggleButton value="desktop" aria-label="Desktop 1280px">
            Desktop
          </ToggleButton>
          <ToggleButton value="tablet" aria-label="Tablet 834px">
            Tablet
          </ToggleButton>
          <ToggleButton value="mobile" aria-label="Mobile 390px">
            Mobile
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        ref={shellRef}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        {isLoadingLink ? (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', width: '100%' }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Fetching preview link…
            </Typography>
          </Stack>
        ) : null}

        {linkError ? (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', width: '100%', p: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {linkError}
            </Typography>
            {onRetryLink ? (
              <Button size="small" onClick={onRetryLink}>
                Retry
              </Button>
            ) : null}
          </Stack>
        ) : null}

        {showFrame ? (
          <Box
            sx={{
              width: deviceWidth * scale,
              height: frameHeight * scale,
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <Box
              sx={{
                width: deviceWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                bgcolor: 'background.paper',
                boxShadow: 1,
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Box
                component="iframe"
                ref={iframeRef}
                src={src ?? undefined}
                title="Storefront live preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                sx={{
                  border: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  opacity: isPreviewReady ? 1 : 0.35,
                  transition: 'opacity 120ms ease'
                }}
              />
            </Box>
          </Box>
        ) : null}

        {showFrame && !isPreviewReady ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              bgcolor: 'rgba(255,255,255,0.55)'
            }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Waiting for preview…
            </Typography>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default PreviewPane;
