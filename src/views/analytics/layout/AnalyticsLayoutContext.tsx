import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'store';
import axiosServices from 'utils/axios';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab, WidgetSize } from '../registry/types';
import {
  ANALYTICS_LAYOUT_COMPANY_FALLBACK,
  getDefaultLayouts,
  getLayoutWidgetRegistry,
  resolveInitialLayouts,
  saveLayoutToServer,
  saveStoredLayouts,
  type StoredAnalyticsLayouts
} from './analyticsLayoutStorage';
import { reorder, resetLayout, resize, type LayoutV2 } from './layoutModel';

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
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  isHydrated: boolean;
  companyId: string;
};

const AnalyticsLayoutContext = createContext<AnalyticsLayoutContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialTab: AnalyticsTab;
};

export const AnalyticsLayoutProvider: React.FC<Props> = ({ children, initialTab }) => {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id) || ANALYTICS_LAYOUT_COMPANY_FALLBACK;
  const [layouts, setLayouts] = useState<StoredAnalyticsLayouts>(() => getDefaultLayouts());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsHydrated(false);

    const hydrate = async () => {
      const resolved = await resolveInitialLayouts(axiosServices, companyId);
      if (cancelled) {
        return;
      }
      setLayouts(resolved);
      saveStoredLayouts(resolved, companyId);
      setIsHydrated(true);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveStoredLayouts(layouts, companyId);
    saveLayoutToServer(layouts, axiosServices, companyId);
  }, [layouts, isHydrated, companyId]);

  const addWidget = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => {
      const registry = getLayoutWidgetRegistry();
      const definition = registry[widgetId];
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
    const registry = getLayoutWidgetRegistry();
    setLayouts((current) => ({
      ...current,
      [tab]: resetLayout(registry, DEFAULT_LAYOUTS[tab])
    }));
  }, []);

  const isWidgetInLayout = useCallback(
    (widgetId: string, tab: AnalyticsTab = activeTab) => layouts[tab].widgets.some((entry) => entry.id === widgetId),
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
      reorderWidget,
      resizeWidget,
      resetTabLayout,
      isWidgetInLayout,
      pickerOpen,
      openPicker,
      closePicker,
      isHydrated,
      companyId
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
      pickerOpen,
      openPicker,
      closePicker,
      isHydrated,
      companyId
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
