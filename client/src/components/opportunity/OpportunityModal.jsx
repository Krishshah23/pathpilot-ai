import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

const STAGES = [
  { value: 'wishlist', label: 'Wishlist', color: 'text-faint' },
  { value: 'applied', label: 'Applied', color: 'text-info' },
  { value: 'oa', label: 'Online Assessment', color: 'text-warning' },
  { value: 'interview', label: 'Interview', color: 'text-violet' },
  { value: 'hr', label: 'HR', color: 'text-brand-soft' },
  { value: 'offer', label: 'Offer', color: 'text-success' },
  { value: 'rejected', label: 'Rejected', color: 'text-danger' },
];

const empty = {
  company: '',
  role: '',
  stage: 'wishlist',
  url: '',
  notes: '',
  salary: '',
  location: '',
};

/**
 * Full-screen modal for creating or editing an opportunity. Fields are laid out
 * in a clean, grouped fashion matching the app's premium dark aesthetic.
 */
export function OpportunityModal({ open, onClose, onSubmit, initial = null, loading = false }) {
  const [form, setForm] = useState(empty);
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="glass relative w-full max-w-lg rounded-2xl shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">
            {editing ? 'Edit opportunity' : 'Add opportunity'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-ink"
          >
            <Icon.X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Company + Role row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required>
              <input
                id="opp-company"
                type="text"
                placeholder="e.g. Google"
                value={form.company}
                onChange={set('company')}
                required
                className="input"
              />
            </Field>
            <Field label="Role" required>
              <input
                id="opp-role"
                type="text"
                placeholder="e.g. SDE Intern"
                value={form.role}
                onChange={set('role')}
                required
                className="input"
              />
            </Field>
          </div>

          {/* Stage */}
          <Field label="Stage">
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, stage: s.value }))}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                    form.stage === s.value
                      ? 'border-brand/50 bg-brand/15 text-brand-soft'
                      : 'border-line bg-surface-2/60 text-muted hover:border-line hover:text-ink'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Location + Salary row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location">
              <input
                id="opp-location"
                type="text"
                placeholder="e.g. Bangalore"
                value={form.location}
                onChange={set('location')}
                className="input"
              />
            </Field>
            <Field label="Salary / Stipend">
              <input
                id="opp-salary"
                type="text"
                placeholder="e.g. ₹30k/mo"
                value={form.salary}
                onChange={set('salary')}
                className="input"
              />
            </Field>
          </div>

          {/* URL */}
          <Field label="Link">
            <input
              id="opp-url"
              type="url"
              placeholder="https://..."
              value={form.url}
              onChange={set('url')}
              className="input"
            />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              id="opp-notes"
              rows={3}
              placeholder="Anything you want to remember…"
              value={form.notes}
              onChange={set('notes')}
              className="input resize-none"
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? 'Save changes' : 'Add opportunity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
