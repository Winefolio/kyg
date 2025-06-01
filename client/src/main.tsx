import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Chrome-specific cache clearing for deployment issues
if (navigator.userAgent.includes('Chrome')) {
  const hasCleared = sessionStorage.getItem('chrome-cache-v1.4.0');
  if (!hasCleared) {
    sessionStorage.setItem('chrome-cache-v1.4.0', 'true');
    // Clear caches on first load of new version
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}

// Register service worker for PWA functionality with Chrome-specific cache busting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // For Chrome, aggressively clear old service workers and caches
      if (navigator.userAgent.includes('Chrome')) {
        // Clear all caches first
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        // Unregister existing service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Register with cache-busting timestamp
      const timestamp = Date.now();
      const registration = await navigator.serviceWorker.register(`/service-worker.js?v=${timestamp}`);
      
      // Force immediate activation
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload page when new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
