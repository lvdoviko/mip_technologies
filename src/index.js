// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';

// Importazione del nuovo componente MainApp anziché App
import MainApp from './MainApp.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);