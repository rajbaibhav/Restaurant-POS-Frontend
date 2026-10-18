export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ ServiceWorker registered successfully with scope:', registration.scope);

          // Check for worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New PWA content is available; please refresh.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ ServiceWorker registration failed:', error);
        });
    });
  }
}
