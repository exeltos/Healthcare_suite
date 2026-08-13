import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/core/Toast/Toast'
import AppFeedbackBridge from './components/core/AppFeedbackBridge'
import { I18nProvider } from './i18n'
import { IS_PRODUCTION } from './core/runtime'
import { clearProductionLocalOperationalCache } from './data/productionDataBoundary'
import './styles/theme.css'
import './styles/app.css'
import './styles/global-consistency.css'

if (IS_PRODUCTION) clearProductionLocalOperationalCache()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastProvider>
      <AppFeedbackBridge />
      <BrowserRouter>
        <App />
      </BrowserRouter>
      </ToastProvider>
    </I18nProvider>
  </React.StrictMode>,
)
