import React from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-nexura-950 bg-nexura-radial flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-nexura-300 mb-8 max-w-sm mx-auto">
              An unexpected error occurred. You can try again or return to the
              home page.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleRetry} className="btn-primary px-5 py-2.5">
                <RefreshCcw className="w-4 h-4" /> Try again
              </button>
              <button onClick={this.handleGoHome} className="btn-ghost px-5 py-2.5">
                <Home className="w-4 h-4" /> Go home
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-nexura-400 cursor-pointer hover:text-nexura-300">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-red-400/80 bg-red-500/5 rounded-lg p-3 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
