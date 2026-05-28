

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { FirebaseProvider } from './components/FirebaseProvider';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline support
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </React.StrictMode>
);