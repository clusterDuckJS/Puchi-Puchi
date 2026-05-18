import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './stylesheet.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

const redirectPath = window.sessionStorage.getItem("spa-redirect");

if (redirectPath) {
  window.sessionStorage.removeItem("spa-redirect");
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
