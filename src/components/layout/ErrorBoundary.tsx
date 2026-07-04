// Secure Error Boundary container
// Path: src/components/layout/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WarningIcon } from '../ui/Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Batcave terminal:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-height-100vh flex flex-col justify-center items-center p-8 bg-bat-black text-bat-white font-mono text-center">
          <div className="max-w-md p-8 border border-bat-danger bg-bat-dark rounded shadow-2xl space-y-6">
            <div className="text-bat-danger flex justify-center animate-pulse">
              <WarningIcon size={64} />
            </div>

            <h1 className="font-bebas text-4xl text-bat-danger tracking-widest">SYSTEM SYSTEM CRASH</h1>
            
            <p className="text-xs text-bat-gray leading-relaxed">
              Sir, an unexpected breach has occurred in the mainframe grid rendering components. Gotham needs you to reload immediately.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-bat-danger text-white font-bebas text-lg tracking-widest transition-colors rounded shadow-[0_0_15px_rgba(232,64,64,0.3)]"
            >
              RELOAD COMMAND TERMINAL
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
