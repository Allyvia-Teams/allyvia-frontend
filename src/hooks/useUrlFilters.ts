import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterConfig {
  [key: string]: string | number | boolean;
}

interface UseUrlFiltersReturn<T> {
  filters: T;
  updateFilter: (key: keyof T, value: any) => void;
  updateFilters: (updates: Partial<T>) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof T) => void;
}

export function useUrlFilters<T extends FilterConfig>(defaultFilters: T): UseUrlFiltersReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const currentFilters = { ...defaultFilters };

    for (const key in defaultFilters) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const defaultValue = defaultFilters[key];
        if (typeof defaultValue === 'number') {
          currentFilters[key] = parseInt(urlValue, 10) as T[Extract<keyof T, string>];
        } else if (typeof defaultValue === 'boolean') {
          currentFilters[key] = (urlValue === 'true') as T[Extract<keyof T, string>];
        } else {
          currentFilters[key] = urlValue as T[Extract<keyof T, string>];
        }
      }
    }

    return currentFilters;
  }, [searchParams, defaultFilters]);

  const updateFilter = useCallback(
    (key: keyof T, value: any) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);

        if (value === null || value === undefined || value === '' || value === defaultFilters[key]) {
          params.delete(String(key));
        } else {
          params.set(String(key), String(value));
        }

        if (key !== 'page' && params.has('page')) {
          params.set('page', '1');
        }

        return params;
      });
    },
    [setSearchParams, defaultFilters]
  );

  const updateFilters = useCallback(
    (updates: Partial<T>) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);

        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === undefined || value === '' || value === defaultFilters[key]) {
            params.delete(key);
          } else {
            params.set(key, String(value));
          }
        }

        if (!updates.hasOwnProperty('page') && params.has('page')) {
          params.set('page', '1');
        }

        return params;
      });
    },
    [setSearchParams, defaultFilters]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const clearFilter = useCallback(
    (key: keyof T) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete(String(key));
        return params;
      });
    },
    [setSearchParams]
  );

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter
  };
}
