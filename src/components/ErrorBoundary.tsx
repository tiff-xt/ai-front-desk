import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { resetDemo } from '@/store/store'

interface Props {
  /** Shown in the message, e.g. "the staff console". */
  area: string
  children: ReactNode
}

interface State {
  error: Error | null
  details: string
  copied?: boolean
}

/**
 * A crash in one view must never blank the whole app. This catches it, keeps
 * the rest of the screen working, and gives the person a way forward (try
 * again, or reset the demo) plus details they can send to a developer.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, details: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const details = `${error.stack ?? `${error.name}: ${error.message}`}\n\nComponents:${info.componentStack ?? ''}`.trim()
    this.setState({ details })
    console.error(`[${this.props.area}]`, error, info.componentStack)
  }

  render() {
    const { error, details } = this.state
    if (!error) return this.props.children
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div role="alert" className="card max-w-sm p-5 text-center shadow-card">
          <div className="font-serif text-lg font-semibold">Something went wrong in {this.props.area}</div>
          <p className="mt-1 text-sm text-ink-muted">
            The rest of the app still works. Try again, or reset the demo to its starting point.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => this.setState({ error: null, details: '', copied: false })}>
              Try again
            </button>
            <button
              className="btn-quiet"
              onClick={() => {
                resetDemo()
                this.setState({ error: null, details: '', copied: false })
              }}
            >
              <RotateCcw size={14} /> Reset demo
            </button>
          </div>
          {/* The first line of the error, visible, so a screenshot alone is enough to diagnose it. */}
          <p className="mt-4 break-words rounded-lg bg-surface-2 px-3 py-2 text-left font-mono text-2xs text-ink-muted">{error.message}</p>
          <button
            className="mt-2 text-xs text-ink-subtle underline-offset-2 hover:underline"
            onClick={() => {
              void navigator.clipboard?.writeText(details).catch(() => {})
              this.setState({ copied: true })
            }}
          >
            {this.state.copied ? 'Copied' : 'Copy full details for the developer'}
          </button>
        </div>
      </div>
    )
  }
}
