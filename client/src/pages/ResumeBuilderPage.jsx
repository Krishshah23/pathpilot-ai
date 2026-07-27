/**
 * pages/ResumeBuilderPage.jsx — Resume Builder Hub Page (/resume-builder)
 *
 * ARCHITECTURAL ROLE:
 * Entry point for the Resume Builder feature. Fetches the candidate's builder
 * document on load:
 *   - Doesn't exist yet → shows the 3-mode landing screen (LandingModes.jsx)
 *   - Exists            → shows the split-panel editor (Editor.jsx)
 *
 * All three entry modes (scratch / import / migrate) converge on the same
 * editor once POST /resume-builder/init succeeds — the mode only affects how
 * the document is pre-populated server-side.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { LandingModes } from '@/components/resumeBuilder/LandingModes';
import { Editor } from '@/components/resumeBuilder/Editor';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function ResumeBuilderPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [resumeBuilder, setResumeBuilder] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [showLanding, setShowLanding] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/resume-builder');
      setResumeBuilder(data.data.exists ? data.data.resumeBuilder : null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load your resume builder'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initFrom = async (mode, file) => {
    setInitializing(true);
    try {
      let payload;
      if (mode === 'migrate') {
        payload = new FormData();
        payload.append('mode', mode);
        payload.append('file', file);
      } else {
        payload = { mode };
      }
      const { data } = await api.post('/resume-builder/init', payload);
      setResumeBuilder(data.data.resumeBuilder);
      setShowLanding(false);
      toast.success('Resume builder ready');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start the resume builder'));
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {resumeBuilder && !showLanding ? (
        <Editor
          resumeBuilder={resumeBuilder}
          setResumeBuilder={setResumeBuilder}
          onSwitchMode={initFrom}
          initializing={initializing}
          onBack={() => setShowLanding(true)}
        />
      ) : (
        <LandingModes
          onSelect={initFrom}
          initializing={initializing}
          onContinue={resumeBuilder ? () => setShowLanding(false) : null}
        />
      )}
    </AppShell>
  );
}
