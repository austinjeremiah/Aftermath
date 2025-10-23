import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import UniversalCounterExample from './Counter';
import UniversalHTLCApp from './UniversalHTLC';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <UniversalHTLCApp />
  </React.StrictMode>
);