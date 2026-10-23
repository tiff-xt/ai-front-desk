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
    const details = `${error.name}: ${error.message}\n${info.componentStack ?? ''}`.trim()
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
          <p className="mt-1 text-sm text-ink-muted">The rest of the app still works. Try again, or reset the demo to its starting point.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => this.setState({ error: null, details: '' })}>
              Try again
            </button>
            <button
              className="btn-quiet"
              onClick={() => {
                resetDemo()
                this.setState({ error: null, details: '' })
              }}
            >
              <RotateCcw size={14} /> Reset demo
            </button>
          </div>
          <button className="mt-3 text-xs text-ink-subtle underline-offset-2 hover:underline" onClick={() => navigator.clipboard?.writeText(details)}>
            Copy details for the developer
          </button>
        </div>
      </div>
    )
  }
}
