const CACHE_NAME = 'nextstep-study-v8';
const APP_ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './firebase-config.js', './sync-merge.js', './cloud-sync.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('nextstep-study-') && name!==CACHE_NAME).map(name=>caches.delete(name)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  // Always check for new app scripts and the Firebase configuration when online.
  const refreshable=/\.(?:js|webmanifest)$/.test(url.pathname);
  if(refreshable){
    event.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});}
    return res;
  })));
});
