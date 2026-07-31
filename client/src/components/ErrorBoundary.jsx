import React from 'react';
import { Icon } from '@/components/ui/icons';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PathPilot UI Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-surface-2 rounded-2xl border border-line m-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4">
            <Icon.AlertTriangle size={24} />
          </div>
          <h2 className="font-serif text-lg font-bold text-ink">Something went wrong loading this view</h2>
          <p className="mt-2 text-xs text-muted max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-xs font-semibold text-white hover:bg-ink/90 transition-colors"
          >
            <Icon.RotateCw size={14} /> Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
