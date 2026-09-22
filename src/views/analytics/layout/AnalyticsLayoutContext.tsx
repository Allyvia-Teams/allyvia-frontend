import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnalyticsAPI } from 'api/analytics.api';
import type { AnalyticsTab } from '../registry/types';
import { loadStoredLayouts, saveStoredLayouts, getDefaultLayouts, type StoredAnalyticsLayouts } from './analyticsLayoutStorage';
import { isWidgetAllowedOnTab, sanitizeLayouts } from './analyticsLayoutRules';

type AnalyticsLayoutContextValue = {
  layouts: StoredAnalyticsLayouts;
  activeTab: AnalyticsTab;
  setActiveTab: (tab: AnalyticsTab) => void;
  addWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  removeWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  isWidgetInLayout: (widgetId: string, tab?: AnalyticsTab) => boolean;
  resetTabToDefault: (tab?: AnalyticsTab) => void;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

const AnalyticsLayoutContext = createContext<AnalyticsLayoutContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialTab: AnalyticsTab;
};

// How long to wait after the last change before writing to the server. Adding
// three widgets in a row is one request, not three, and the local cache keeps
// the UI honest in between.
const SAVE_DEBOUNCE_MS = 600;

export const AnalyticsLayoutProvider: React.FC<Props> = ({ children, initialTab }) => {
  // Start from the local cache so the tab does not flash the default layout
  // while the account's real layout is still in flight.
  const [layouts, setLayouts] = useState<StoredAnalyticsLayouts>(() => loadStoredLayouts());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Nothing is written back until the server's copy has arrived. Without this
  // the mount-time cache value would immediately be saved over the account's
  // real layout - on a shared device, with the previous user's arrangement.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    AnalyticsAPI.Layout.get()
      .then((remote) => {
        if (cancelled) return;
        // An empty object means the user has never customised the tab, so the
        // defaults stand rather than the previous user's cached layout.
        const next = remote && Object.keys(remote).length > 0 ? sanitizeLayouts(remote) : getDefaultLayouts();
        setLayouts(next);
        saveStoredLayouts(next);
      })
      .catch(() => {
        // Offline, or not authorised. The cached layout stays on screen and
        // edits are still saved locally; the next successful load reconciles.
      })
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;

    saveStoredLayouts(layouts);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AnalyticsAPI.Layout.save(layouts).catch(() => {
        // Keep the local copy; the layout is a preference, not data the user
        // would lose work over, and a failed write should not interrupt them.
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [layouts]);

  const addWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
      // A widget only renders correctly on its own tab - the employee widgets
      // read a provider that only the Employee tab mounts. Refusing here means
      // no caller can put a layout into a state the grid cannot render.
      if (!isWidgetAllowedOnTab(widgetId, tab)) {
        return;
      }

      setLayouts((current) => {
        const layout = current[tab];
        if (layout.includes(widgetId)) {
          return current;
        }

        return {
          ...current,
          [tab]: [...layout, widgetId]
        };
      });
    },
    [activeTab]
  );

  const removeWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
      setLayouts((current) => ({
        ...current,
        [tab]: current[tab].filter((id) => id !== widgetId)
      }));
    },
    [activeTab]
  );

  const isWidgetInLayout = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => layouts[tab].includes(widgetId),
    [activeTab, layouts]
  );

  const resetTabToDefault = useCallback(
    (tab: AnalyticsTab = activeTab) => {
      setLayouts((current) => ({ ...current, [tab]: getDefaultLayouts()[tab] }));
    },
    [activeTab]
  );

  const value = useMemo(
    () => ({
      layouts,
      activeTab,
      setActiveTab,
      addWidget,
      removeWidget,
      isWidgetInLayout,
      resetTabToDefault,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false)
    }),
    [layouts, activeTab, addWidget, removeWidget, isWidgetInLayout, resetTabToDefault, pickerOpen]
  );

  return <AnalyticsLayoutContext.Provider value={value}>{children}</AnalyticsLayoutContext.Provider>;
};

export function useAnalyticsLayout(): AnalyticsLayoutContextValue {
  const context = useContext(AnalyticsLayoutContext);
  if (!context) {
    throw new Error('useAnalyticsLayout must be used within AnalyticsLayoutProvider');
  }
  return context;
}

export function useOptionalAnalyticsLayout(): AnalyticsLayoutContextValue | null {
  return useContext(AnalyticsLayoutContext);
}
