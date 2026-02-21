import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './context/i18nContext';
import ErrorBoundary from './components/ErrorBoundary';

// Global safety net for unhandled Promise rejections (not caught by React ErrorBoundary)
window.addEventListener('unhandledrejection', (event) => {
  console.error('[PLOTMATE] Unhandled promise rejection:', event.reason);
  // Prevent the default browser error logging (we handle it above)
  event.preventDefault();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);