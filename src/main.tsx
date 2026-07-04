import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

// Register PWA Service Worker for offline capability (only in production)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered.', reg))
        .catch(err => console.error('Service Worker registration failed.', err));
    });
  } else {
    // Unregister any active service worker in development to prevent caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Development mode: active service worker unregistered.');
            // Clear caches to prevent old cached assets from being served
            caches.keys().then((keys) => {
              return Promise.all(keys.map(key => caches.delete(key)));
            }).then(() => {
              window.location.reload();
            });
          }
        });
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
