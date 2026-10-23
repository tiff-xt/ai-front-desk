import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './styles.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Last line of defense; each view also has its own boundary so a crash stays local. */}
    <ErrorBoundary area="the app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
