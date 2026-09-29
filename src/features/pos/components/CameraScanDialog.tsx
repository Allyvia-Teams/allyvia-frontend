import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

/**
 * ALL-105 — the camera half of scan-to-sell.
 *
 * The wedge path (a USB or Bluetooth scanner typing into the till) is what a
 * counter actually uses and is handled by useBarcodeScanner. This is the
 * fallback for a tablet with no scanner attached: point the camera at the
 * label.
 *
 * It uses the platform's own `BarcodeDetector` rather than pulling in a
 * decoder bundle. That is a deliberate trade: no new dependency and no
 * megabyte of wasm on the shop wifi at open-up, at the cost of Safari — which
 * does not implement it. `isCameraScanSupported()` is exported so the caller
 * can leave the button out entirely on a browser that cannot honour it,
 * instead of offering a control that fails when pressed.
 */

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

// The label formats a boutique's stock actually carries, plus QR for the
// hand-printed ones.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

function detectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

export function isCameraScanSupported(): boolean {
  return detectorCtor() !== null && typeof navigator?.mediaDevices?.getUserMedia === 'function';
}

export interface CameraScanDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with each decoded code. The dialog stays open so a second item can
   *  be scanned without reopening it — the same "survives repeated scans" rule
   *  the inventory scanner now follows. */
  onDetected: (code: string) => void;
}

export default function CameraScanDialog({ open, onClose, onDetected }: CameraScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [error, setError] = useState<string | null>(null);
  const [lastAccepted, setLastAccepted] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const Ctor = detectorCtor();
    if (!Ctor) {
      setError('This browser cannot scan with the camera. Use a barcode scanner or type the code.');
      return undefined;
    }

    let cancelled = false;
    const detector = new Ctor({ formats: FORMATS });

    const scan = async () => {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => void scan());
        return;
      }
      try {
        const hits = await detector.detect(video);
        const code = hits[0]?.rawValue?.trim();
        if (code) {
          // One label sits in frame for many frames. Accept a given code once
          // a second so a steady hand does not add twelve of the same item.
          const previous = lastCodeRef.current;
          const now = performance.now();
          if (!previous || previous.code !== code || now - previous.at > 1000) {
            lastCodeRef.current = { code, at: now };
            setLastAccepted(code);
            onDetectedRef.current(code);
          }
        }
      } catch {
        // A single failed frame is normal (motion blur, no label in view).
      }
      if (!cancelled) rafRef.current = requestAnimationFrame(() => void scan());
    };

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        void scan();
      } catch {
        if (!cancelled) setError('No camera available, or permission was refused.');
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLastAccepted(null);
      lastCodeRef.current = null;
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Scan with camera</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="warning">{error}</Alert>
        ) : (
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'common.black',
              aspectRatio: '4 / 3'
            }}
          >
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {lastAccepted ? `Added ${lastAccepted}. Keep scanning, or close when you're done.` : 'Hold the barcode in frame.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ textTransform: 'none' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
