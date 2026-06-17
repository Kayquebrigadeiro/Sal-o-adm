import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

const CURRENT_APP_VERSION = 'v8.1.1';
const storedVersion = localStorage.getItem('app_version');

if (storedVersion !== CURRENT_APP_VERSION) {
  // Log informativo: notifica sobre cache-busting automático em nova versão
  console.log('🔄 Nova versão detectada. Limpando cache antigo...');
  try {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('app_version', CURRENT_APP_VERSION);
  } catch (e) {
    console.warn('Erro localStorage', e);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
)

