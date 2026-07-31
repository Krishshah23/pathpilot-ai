/**
 * lib/useSavedJobs.js — "Save Job" + Application Status localStorage Hook
 *
 * No backend involved — saved jobs are a pure client-side bookmark list keyed
 * by job id, shared across every surface that renders a JobCard (the full
 * Live Jobs page and the compact Overview teaser) via the same localStorage
 * key. Each saved job also carries a `status` (wishlist/applied/oa/interview/
 * rejected) so application tracking lives directly on the job card instead of
 * a separate kanban board.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'pp_saved_jobs';

export const JOB_STATUSES = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'oa', label: 'OA' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
];

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Older saved entries predate the status field — default them to 'wishlist'.
    return parsed.map((j) => ({ ...j, status: j.status || 'wishlist' }));
  } catch {
    return [];
  }
}

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState(readStored);
  const savedIds = useMemo(() => new Set(savedJobs.map((j) => j.id)), [savedJobs]);

  const persist = useCallback((jobs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    setSavedJobs(jobs);
  }, []);

  // Keep in sync if another tab/component mutates the same key
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSavedJobs(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);

  const getStatus = useCallback(
    (id) => savedJobs.find((j) => j.id === id)?.status || 'wishlist',
    [savedJobs]
  );

  const toggleSave = useCallback((job) => {
    const current = readStored();
    const exists = current.some((j) => j.id === job.id);
    const next = exists
      ? current.filter((j) => j.id !== job.id)
      : [...current, { ...job, status: 'wishlist' }];
    persist(next);
  }, [persist]);

  const setStatus = useCallback((id, status) => {
    const current = readStored();
    const next = current.map((j) => (j.id === id ? { ...j, status } : j));
    persist(next);
  }, [persist]);

  const clearAll = useCallback(() => persist([]), [persist]);

  return { savedJobs, isSaved, getStatus, toggleSave, setStatus, clearAll, count: savedJobs.length };
}
