import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          padding: '1rem',
          background: '#1a0000',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          color: '#ff6666',
          fontFamily: 'monospace',
          fontSize: '12px',
          margin: '4px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Error en {this.props.name || 'componente'}
          </div>
          <div style={{ color: '#999', fontSize: '11px' }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '4px 12px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
