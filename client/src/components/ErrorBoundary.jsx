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
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-[#FBFBFA] rounded-2xl border border-[#EAEAE5] m-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF5F3] text-[#B85A3C] mb-4">
            <Icon.AlertTriangle size={24} />
          </div>
          <h2 className="font-serif text-lg font-bold text-[#171717]">Something went wrong loading this view</h2>
          <p className="mt-2 text-xs text-[#525252] max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Icon.RotateCw size={14} /> Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
