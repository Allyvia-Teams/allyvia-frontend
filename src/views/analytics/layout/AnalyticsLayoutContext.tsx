import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axiosServices from 'utils/axios';
import type { AnalyticsTab } from '../registry/types';
import {
  getDefaultLayouts,
  resolveInitialLayouts,
  saveLayoutToServer,
  saveStoredLayouts,
  type StoredAnalyticsLayouts
} from './analyticsLayoutStorage';

type AnalyticsLayoutContextValue = {
  layouts: StoredAnalyticsLayouts;
  activeTab: AnalyticsTab;
  setActiveTab: (tab: AnalyticsTab) => void;
  addWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  removeWidget: (widgetId: string, tab?: AnalyticsTab) => void;
  isWidgetInLayout: (widgetId: string, tab?: AnalyticsTab) => boolean;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  isHydrated: boolean;
};

const AnalyticsLayoutContext = createContext<AnalyticsLayoutContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialTab: AnalyticsTab;
};

export const AnalyticsLayoutProvider: React.FC<Props> = ({ children, initialTab }) => {
  const [layouts, setLayouts] = useState<StoredAnalyticsLayouts>(() => getDefaultLayouts());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const resolved = await resolveInitialLayouts(axiosServices);
      if (cancelled) {
        return;
      }
      setLayouts(resolved);
      saveStoredLayouts(resolved);
      setIsHydrated(true);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveStoredLayouts(layouts);
    saveLayoutToServer(layouts, axiosServices);
  }, [layouts, isHydrated]);

  const addWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
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

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const value = useMemo(
    () => ({
      layouts,
      activeTab,
      setActiveTab,
      addWidget,
      removeWidget,
      isWidgetInLayout,
      pickerOpen,
      openPicker,
      closePicker,
      isHydrated
    }),
    [layouts, activeTab, addWidget, removeWidget, isWidgetInLayout, pickerOpen, openPicker, closePicker, isHydrated]
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
