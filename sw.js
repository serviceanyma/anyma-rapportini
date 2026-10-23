/* ANYMA Rapportini — service worker
   - pagina (index.html): prima la rete, se manca usa la copia salvata → aggiornamenti immediati e avvio offline
   - librerie, font, CSS condiviso: copia salvata subito, aggiornata in background
   - Microsoft 365 (login, Graph, SharePoint): mai salvati, passano sempre dalla rete */
const VERSION = 'rt-v172';
const SHELL = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/', 'https://cdn.jsdelivr.net/', 'https://alcdn.msauth.net/',
  'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/', 'https://serviceanyma.github.io/anyma-ds/'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // Pagina dell'app: rete prima, copia salvata se offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Librerie e font: copia salvata subito, aggiornata in background
  if (CDN.some(p => url.startsWith(p))) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }

  // File dell'app (icone, manifest): copia salvata se disponibile
  if (url.startsWith(self.registration.scope)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
  // Tutto il resto (Microsoft 365, Graph, SharePoint) non viene toccato
});
