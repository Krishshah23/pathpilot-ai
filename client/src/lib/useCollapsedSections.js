/**
 * lib/useCollapsedSections.js — Persisted Collapse State for Dashboard Sections
 *
 * Lets secondary dashboard cards (Live Opportunities, AI Narrative, Salary, etc.)
 * be collapsed by the user, remembered across visits, without needing any backend
 * field — the dashboard was previously a fixed, always-fully-expanded vertical
 * stack with no way to hide sections a given user doesn't care about on repeat
 * visits.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pp_dashboard_collapsed_v1';

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function useCollapsedSections() {
  const [collapsedMap, setCollapsedMap] = useState(readStore);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedMap));
  }, [collapsedMap]);

  const isCollapsed = useCallback((id) => Boolean(collapsedMap[id]), [collapsedMap]);

  const toggle = useCallback((id) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return { isCollapsed, toggle };
}
