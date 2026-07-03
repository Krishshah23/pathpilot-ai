import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { HealthBreakdown } from '@/components/resume/HealthBreakdown';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';

export default function ResumePage() {
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/resume');
        setResume(data.data.resume);
      } catch {
        /* no resume yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/resume/analyze', fd);
      setResume(data.data.resume);
      setFile(null);
      setShowUpload(false);
      await refreshUser();
      if (data.data.resume.lowText) {
        toast.warning('We could not read enough text from that file.');
      } else {
        toast.success('Resume analyzed!');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Analysis failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const actions = resume && (
    <Button size="sm" variant="outline" onClick={() => setShowUpload((s) => !s)}>
      <Icon.Upload size={16} /> Analyze new
    </Button>
  );

  return (
    <AppShell title="Resume Intelligence" subtitle="Extract, score, and improve your resume" actions={actions}>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : !resume || showUpload ? (
        <UploadPanel
          file={file}
          setFile={setFile}
          analyzing={analyzing}
          onAnalyze={analyze}
          onCancel={resume ? () => setShowUpload(false) : null}
        />
      ) : (
        <ResumeResults resume={resume} />
      )}
    </AppShell>
  );
}

function UploadPanel({ file, setFile, analyzing, onAnalyze, onCancel }) {
  return (
    <Card className="mx-auto max-w-xl">
      <div className="text-center">
        <h2 className="font-display text-lg font-bold text-ink">Upload your resume</h2>
        <p className="mt-1 text-sm text-muted">
          We'll extract your skills, education, projects and more — then score its health.
        </p>
      </div>

      <div className="mt-6">
        <FileUpload file={file} onSelect={setFile} />
      </div>

      {analyzing ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-line bg-surface-2/50 py-4 text-sm text-muted">
          <Spinner className="h-5 w-5 text-brand" />
          <span>Analyzing your resume… reading text and scoring health.</span>
        </div>
      ) : (
        <div className="mt-6 flex justify-center gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={onAnalyze} disabled={!file}>
            <Icon.Sparkles size={16} /> Analyze resume
          </Button>
        </div>
      )}
    </Card>
  );
}

function ResumeResults({ resume }) {
  return (
    <div className="space-y-6">
      {resume.lowText && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm text-warning">
            We couldn't read enough text from this file — it may be a scanned image. Upload a
            text-based PDF for a full analysis.
          </p>
        </Card>
      )}

      {/* Health + suggestions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <h2 className="mb-2 font-display text-base font-semibold text-ink">Resume Health</h2>
          <ScoreGauge score={resume.healthScore} />
          <p className="mt-2 text-xs text-faint">{resume.wordCount} words analyzed</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">Health breakdown</h2>
          <div className="mt-4">
            <HealthBreakdown breakdown={resume.healthBreakdown} />
          </div>
        </Card>
      </div>

      {resume.suggestions?.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Icon.Sparkles size={18} className="text-brand-soft" /> Suggestions
          </h2>
          <ul className="mt-4 space-y-2">
            {resume.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <Icon.ChevronRight size={16} className="mt-0.5 shrink-0 text-brand-soft" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Extracted sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Skills" count={resume.skills.length} icon={Icon.Target}>
          {resume.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <Empty text="No skills detected" />
          )}
        </SectionCard>

        <SectionCard title="Education" count={resume.education.length} icon={Icon.Document}>
          <ItemList items={resume.education} />
        </SectionCard>

        <SectionCard title="Experience" count={resume.experience.length} icon={Icon.Briefcase}>
          <ItemList items={resume.experience} />
        </SectionCard>

        <SectionCard title="Projects" count={resume.projects.length} icon={Icon.Route}>
          {resume.projects.length ? (
            <ul className="space-y-3">
              {resume.projects.map((p, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface-2/40 p-3">
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  {p.description && <p className="mt-0.5 text-xs text-muted">{p.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No projects detected" />
          )}
        </SectionCard>

        <SectionCard
          title="Certifications"
          count={resume.certifications.length}
          icon={Icon.Shield}
          className="lg:col-span-2"
        >
          <ItemList items={resume.certifications} />
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({ title, count, icon: Ico, className, children }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-brand-soft">
          <Ico size={16} />
        </span>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <span className="ml-auto rounded-md bg-surface-2 px-2 py-0.5 text-xs text-faint">
          {count}
        </span>
      </div>
      {children}
    </Card>
  );
}

function ItemList({ items }) {
  if (!items?.length) return <Empty text="Nothing detected" />;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted">
          <Icon.Check size={15} className="mt-0.5 shrink-0 text-success" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-faint">{text}</p>;
}
