import { IS_BETA } from './storageScope'   // first: scopes storage before anything reads it
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {IS_BETA && (
      <div className="fixed bottom-2 left-2 z-[100] px-2.5 py-1 rounded-full bg-fuchsia-700/90 text-white text-[11px] font-bold shadow-lg pointer-events-none">
        BETA preview · separate save data from the live app
      </div>
    )}
    <App />
  </StrictMode>,
)
