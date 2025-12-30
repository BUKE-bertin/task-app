const CACHE_NAME = 'task-app-v1';
const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'firebase.js',
  'manifest.json'
];

self.addEventListener('install', (ev)=>{
  ev.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (ev)=>{
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev)=>{
  const req = ev.request;
  // Cache-first for app shell
  ev.respondWith(caches.match(req).then(cached=>{
    if(cached) return cached;
    return fetch(req).then(resp=>{
      if(!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
      return resp;
    }).catch(()=>{
      // fallback to index for navigation
      if(req.mode === 'navigate') return caches.match('index.html');
    });
  }));
});
