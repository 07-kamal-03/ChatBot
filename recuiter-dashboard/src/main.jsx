import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RecruiterDashboard from './RecruiterDashboard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RecruiterDashboard />
  </StrictMode>,
)
