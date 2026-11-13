import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<
  { children: ReactNode; admin?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="container error-page">
          <h1>
            {this.props.admin ? 'The editor could not open.' : 'The portfolio could not load.'}
          </h1>
          <p>Your saved content has not been deleted. Reload this page to recover.</p>
          <button className="button" onClick={() => location.reload()}>
            Reload page
          </button>
          <a className="text-link" href="/">
            Return to portfolio
          </a>
        </section>
      );
    return this.props.children;
  }
}
