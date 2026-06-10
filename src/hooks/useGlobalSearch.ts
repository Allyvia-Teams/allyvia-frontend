import { useEffect, useState } from 'react';
import { searchGlobal } from 'api/globalSearch.api';
import type { GlobalSearchResult } from 'types/globalSearch';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useGlobalSearch(companyId: string | undefined) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await searchGlobal(companyId, query);
        if (!cancelled) {
          setResults(nextResults);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyId, query]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return {
    query,
    setQuery,
    results,
    loading,
    clearSearch
  };
}
