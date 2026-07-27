/**
 * lib/useSavedJobs.js — "Save Job" localStorage Hook (Task 9D)
 *
 * No backend involved — saved jobs are a pure client-side bookmark list keyed
 * by job id, shared across every surface that renders a JobCard (the full
 * Live Jobs tab and the compact Overview widget) via the same localStorage key.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pp_saved_jobs';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSavedJobs() {
  const [savedIds, setSavedIds] = useState(() => new Set(readStored().map((j) => j.id)));
  const [savedJobs, setSavedJobs] = useState(readStored);

  const persist = useCallback((jobs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    setSavedJobs(jobs);
    setSavedIds(new Set(jobs.map((j) => j.id)));
  }, []);

  // Keep in sync if another tab/component mutates the same key
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const jobs = readStored();
        setSavedJobs(jobs);
        setSavedIds(new Set(jobs.map((j) => j.id)));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);

  const toggleSave = useCallback((job) => {
    const current = readStored();
    const exists = current.some((j) => j.id === job.id);
    const next = exists ? current.filter((j) => j.id !== job.id) : [...current, job];
    persist(next);
  }, [persist]);

  const clearAll = useCallback(() => persist([]), [persist]);

  return { savedJobs, isSaved, toggleSave, clearAll, count: savedJobs.length };
}
