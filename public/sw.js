// No-op service worker. Exists only so GET /sw.js returns 200 instead of 404.
// It is intentionally NOT registered anywhere in the app.
self.addEventListener('install', () => {});
self.addEventListener('fetch', () => {});
