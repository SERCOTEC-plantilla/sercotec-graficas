'use strict';
// Bump the version whenever a published application file changes.
const VERSION='2026-09-11-3';
const ROOT=self.registration.scope;
const PREFIX='mantenedor-graficas:'+new URL(ROOT).pathname+':';
const CACHE=PREFIX+VERSION;
const FILES=['index.html','pwa.js','manifest.webmanifest','icons/icon-192-v2.png','icons/icon-512-v2.png','icons/apple-touch-v2.png','icons/icon-maskable-v2.png'];
const URLS=FILES.map(file=>new URL(file,ROOT).href);
const INDEX=URLS[0];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const navigation=event.request.mode==='navigate'&&(url.pathname===new URL(ROOT).pathname||url.pathname===new URL(INDEX).pathname);
  const key=navigation?INDEX:url.href;
  if(!URLS.includes(key))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(key);
    if(cached)return cached;
    // Storage may have been evicted. Re-fetch only the app's own static files.
    try{
      const response=await fetch(new Request(key,{cache:'reload'}));
      if(response.ok)await cache.put(key,response.clone());
      return response;
    }catch(error){return Response.error();}
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='CACHE_STATUS')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const ready=(await Promise.all(URLS.map(url=>cache.match(url)))).every(Boolean);
    event.ports[0]?.postMessage({ready,version:VERSION});
  })());
});
