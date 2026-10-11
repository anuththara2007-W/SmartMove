// Import StrictMode to help detect potential problems during development
import { StrictMode } from 'react'

// Import createRoot to render the React application
import { createRoot } from 'react-dom/client'

// Import the global CSS styles
import './index.css'

// Import the main App component
import App from './App.tsx'

// Find the root HTML element and render the React application inside it
createRoot(document.getElementById('root')!).render(
  // Enable additional development checks
  <StrictMode>
    {/* Display the main application */}
    <App />
  </StrictMode>,
)