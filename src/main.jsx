import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const CURRENT_APP_VERSION = 'v8.1.1';
const storedVersion = localStorage.getItem('app_version');

if (storedVersion !== CURRENT_APP_VERSION) {
  // Limpeza profunda de resquícios de versões velhas/travadas
  console.log('🔄 Nova versão detectada. Limpando cache antigo...');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app_version', CURRENT_APP_VERSION);
  window.location.reload();
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
}
