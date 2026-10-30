import { Component } from 'react';

// Koi component crash kare to poori screen safed na ho, saaf paigham aur "dobara load" ka button dikhe.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-sand-50 px-4">
        <div className="max-w-sm rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-sand-300" role="alert">
          <h1 className="text-lg font-extrabold text-ink">Kuch ghalat ho gaya</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Page dobara load karein. Aap ka kiya hua kaam (jo server par save ho chuka) mehfooz hai.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-marigold-400"
          >
            Dobara load karein
          </button>
        </div>
      </div>
    );
  }
}