import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnalyticsAPI } from 'api/analytics.api';
import type { AnalyticsTab, WidgetSize } from '../registry/types';
import {
  defaultLayoutForTab,
  getDefaultLayouts,
  loadStoredLayouts,
  saveStoredLayouts,
  scheduleRemoteLayoutSave,
  type StoredAnalyticsLayouts
} from './analyticsLayoutStorage';
import { getLayoutWidgetRegistry, isWidgetAllowedOnTab, sanitizeLayouts } from './analyticsLayoutRules';
import { reorder, resize, type LayoutV2 } from './layoutModel';

type AnalyticsLayoutContextValue = {
  layouts: StoredAnalyticsLayouts;
  activeTab: AnalyticsTab;
  setActiveTab: (tab: AnalyticsTab) => void;
  addWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  removeWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  reorderWidget: (tab: AnalyticsTab, fromId: string, toId: string) => void;
  resizeWidget: (tab: AnalyticsTab, id: string, w: WidgetSize) => void;
  resetTabLayout: (tab: AnalyticsTab) => void;
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

  useEffect(() => {
    let cancelled = false;

    AnalyticsAPI.Layout.get()
      .then((remote) => {
        if (cancelled) return;
        // An empty object means the user has never customised the tab, so the
        // defaults stand rather than the previous user's cached layout.
        // sanitizeLayouts upgrades v1 string[] → LayoutV2 and applies tab rules.
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
    scheduleRemoteLayoutSave(layouts);
  }, [layouts]);

  const addWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
      // A widget only renders correctly on its own tab - the employee widgets
      // read a provider that only the Employee tab mounts. Refusing here means
      // no caller can put a layout into a state the grid cannot render.
      if (!isWidgetAllowedOnTab(widgetId, tab)) {
        return;
      }

      const definition = getLayoutWidgetRegistry()[widgetId];
      if (!definition) {
        return;
      }

      setLayouts((current) => {
        const layout = current[tab];
        if (layout.widgets.some((entry) => entry.id === widgetId)) {
          return current;
        }

        const next: LayoutV2 = {
          version: 2,
          widgets: [...layout.widgets, { id: widgetId, w: definition.defaultSize }]
        };

        return {
          ...current,
          [tab]: next
        };
      });
    },
    [activeTab]
  );

  const removeWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
      setLayouts((current) => ({
        ...current,
        [tab]: {
          version: 2,
          widgets: current[tab].widgets.filter((entry) => entry.id !== widgetId)
        }
      }));
    },
    [activeTab]
  );

  const reorderWidget = useCallback((tab: AnalyticsTab, fromId: string, toId: string) => {
    setLayouts((current) => ({
      ...current,
      [tab]: reorder(current[tab], fromId, toId)
    }));
  }, []);

  const resizeWidget = useCallback((tab: AnalyticsTab, id: string, w: WidgetSize) => {
    setLayouts((current) => ({
      ...current,
      [tab]: resize(current[tab], id, w)
    }));
  }, []);

  const resetTabLayout = useCallback((tab: AnalyticsTab) => {
    setLayouts((current) => ({
      ...current,
      [tab]: defaultLayoutForTab(tab)
    }));
  }, []);

  const isWidgetInLayout = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => layouts[tab].widgets.some((entry) => entry.id === widgetId),
    [activeTab, layouts]
  );

  const resetTabToDefault = useCallback(
    (tab: AnalyticsTab = activeTab) => {
      resetTabLayout(tab);
    },
    [activeTab, resetTabLayout]
  );

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const value = useMemo(
    () => ({
      layouts,
      activeTab,
      setActiveTab,
      addWidget,
      removeWidget,
      reorderWidget,
      resizeWidget,
      resetTabLayout,
      isWidgetInLayout,
      resetTabToDefault,
      pickerOpen,
      openPicker,
      closePicker
    }),
    [
      layouts,
      activeTab,
      addWidget,
      removeWidget,
      reorderWidget,
      resizeWidget,
      resetTabLayout,
      isWidgetInLayout,
      resetTabToDefault,
      pickerOpen,
      openPicker,
      closePicker
    ]
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
