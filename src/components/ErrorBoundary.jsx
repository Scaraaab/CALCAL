import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('CalCal crashed:', error, info);
  }
  reset = () => {
    this.setState({ error: null });
  };
  hardReset = () => {
    if (confirm('¿Borrar datos locales y recargar?')) {
      Object.keys(localStorage).forEach((k) => k.startsWith('calcal:') && localStorage.removeItem(k));
      location.href = '/';
    }
  };
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950 text-white">
          <div className="card p-6 max-w-md w-full space-y-3">
            <h1 className="text-xl font-bold">Algo se rompió</h1>
            <p className="text-sm text-white/60">{String(this.state.error?.message || this.state.error)}</p>
            <pre className="text-[10px] text-white/40 bg-ink-700/60 p-2 rounded-xl overflow-auto max-h-40">
              {this.state.error?.stack}
            </pre>
            <div className="flex gap-2 pt-2">
              <button onClick={this.reset} className="btn-ghost flex-1">Reintentar</button>
              <button onClick={this.hardReset} className="btn-danger flex-1">Borrar datos</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
