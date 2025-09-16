import { useState, useEffect, useCallback } from 'react';

interface UseResendTimerOptions {
  cooldownSeconds?: number;
  storageKey?: string;
}

interface UseResendTimerReturn {
  canResend: boolean;
  countdown: number;
  triggerResend: () => void;
  resetTimer: () => void;
}

export function useResendTimer({ cooldownSeconds = 60, storageKey = 'resendTimestamp' }: UseResendTimerOptions = {}): UseResendTimerReturn {
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const storedTime = sessionStorage.getItem(storageKey);
    if (storedTime) {
      setLastResendTime(parseInt(storedTime, 10));
    }
  }, [storageKey]);

  useEffect(() => {
    if (!lastResendTime) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const timePassed = Math.floor((now - lastResendTime) / 1000);
      const remaining = Math.max(0, cooldownSeconds - timePassed);
      setCountdown(remaining);
    };

    updateCountdown();

    if (countdown > 0) {
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [lastResendTime, cooldownSeconds, countdown]);

  const triggerResend = useCallback(() => {
    const now = Date.now();
    setLastResendTime(now);
    sessionStorage.setItem(storageKey, now.toString());
    setCountdown(cooldownSeconds);
  }, [cooldownSeconds, storageKey]);

  const resetTimer = useCallback(() => {
    setLastResendTime(null);
    setCountdown(0);
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  const canResend = countdown === 0;

  return {
    canResend,
    countdown,
    triggerResend,
    resetTimer
  };
}
