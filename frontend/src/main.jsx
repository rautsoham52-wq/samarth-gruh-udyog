import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CustomerLanguageProvider } from './i18n/CustomerLanguage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CustomerLanguageProvider>
      <App />
    </CustomerLanguageProvider>
  </StrictMode>,
)
