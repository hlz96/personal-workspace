import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen grid place-items-center bg-[rgb(var(--bg))] px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold">页面出错了</h1>
          <p className="text-sm text-[rgb(var(--muted))]">
            抱歉,遇到了一个意外错误。你的数据是安全的,刷新一下通常就能恢复。
          </p>
          <pre className="text-xs text-left rounded-lg border p-3 overflow-auto max-h-40 text-[rgb(var(--muted))]"
            style={{ borderColor: 'rgb(var(--border))' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary justify-center"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}
