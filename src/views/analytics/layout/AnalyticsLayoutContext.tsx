import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnalyticsTab } from '../registry/types';
import { loadStoredLayouts, saveStoredLayouts, type StoredAnalyticsLayouts } from './analyticsLayoutStorage';

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
};

const AnalyticsLayoutContext = createContext<AnalyticsLayoutContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialTab: AnalyticsTab;
};

export const AnalyticsLayoutProvider: React.FC<Props> = ({ children, initialTab }) => {
  const [layouts, setLayouts] = useState<StoredAnalyticsLayouts>(() => loadStoredLayouts());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    saveStoredLayouts(layouts);
  }, [layouts]);

  const addWidget = useCallback((widgetId: string, tab: AnalyticsTab = activeTab) => {
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
  }, [activeTab]);

  const removeWidget = useCallback((widgetId: string, tab: AnalyticsTab = activeTab) => {
    setLayouts((current) => ({
      ...current,
      [tab]: current[tab].filter((id) => id !== widgetId)
    }));
  }, [activeTab]);

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
      closePicker
    }),
    [layouts, activeTab, addWidget, removeWidget, isWidgetInLayout, pickerOpen, openPicker, closePicker]
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
