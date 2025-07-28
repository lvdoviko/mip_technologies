// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';

// Initialize i18n
import './i18n/config';

// Importazione del nuovo componente MainApp anziché App
import MainApp from './MainApp.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
// ✅ DEBUG: Temporarily disable StrictMode to fix handler registration
root.render(
  // <React.StrictMode>
    <MainApp />
  // </React.StrictMode>
);