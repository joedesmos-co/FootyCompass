import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initAppearanceThemeFromStorage } from './utils/appearanceTheme.js'
import { applyBootSeoFromLocation } from './utils/seoBoot.js'
import './index.css'
import App from './App.jsx'

initAppearanceThemeFromStorage()
applyBootSeoFromLocation()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
