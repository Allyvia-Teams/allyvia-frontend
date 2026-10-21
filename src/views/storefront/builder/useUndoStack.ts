import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_UNDO = 20;

/**
 * Generic undo stack (max 20). Cmd/Ctrl+Z restores the most recent snapshot
 * via the handler registered with `setUndoHandler`.
 */
export function useUndoStack<T>() {
  const stackRef = useRef<T[]>([]);
  const [depth, setDepth] = useState(0);
  const handlerRef = useRef<(snapshot: T) => void>(() => undefined);

  const canUndo = depth > 0;

  const push = useCallback((snapshot: T) => {
    const next = [...stackRef.current, snapshot];
    stackRef.current = next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
    setDepth(stackRef.current.length);
  }, []);

  const undo = useCallback((): T | null => {
    if (stackRef.current.length === 0) {
      return null;
    }
    const snapshot = stackRef.current[stackRef.current.length - 1];
    stackRef.current = stackRef.current.slice(0, -1);
    setDepth(stackRef.current.length);
    return snapshot;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    setDepth(0);
  }, []);

  const setUndoHandler = useCallback((handler: (snapshot: T) => void) => {
    handlerRef.current = handler;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'z' || event.shiftKey) {
        return;
      }
      if (stackRef.current.length === 0) {
        return;
      }
      event.preventDefault();
      const snapshot = stackRef.current[stackRef.current.length - 1];
      stackRef.current = stackRef.current.slice(0, -1);
      setDepth(stackRef.current.length);
      handlerRef.current(snapshot);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { push, undo, canUndo, clear, setUndoHandler };
}
