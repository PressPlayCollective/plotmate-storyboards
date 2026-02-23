import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PLOTMATE Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-surface rounded-2xl p-8 text-center border border-[#333]">
            <div className="text-5xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-white mb-2 font-oswald">
              Something Went Wrong
            </h1>
            <p className="text-gray-400 mb-6 text-sm">
              PLOTMATE encountered an unexpected error. Your project data is safely stored in local storage.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs text-red-400 bg-canvas p-3 rounded-lg mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-accent hover:bg-accent text-white font-bold rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
