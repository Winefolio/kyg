import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DebugErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 [ERROR BOUNDARY] Error caught:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [ERROR BOUNDARY] Component stack:', {
      boundaryName: this.props.name || 'Unknown',
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      console.log('🚨 [ERROR BOUNDARY] Rendering fallback UI');
      return this.props.fallback || (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
          <h3 className="text-red-300 font-bold">Error in {this.props.name || 'Component'}</h3>
          <p className="text-red-200 text-sm">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}