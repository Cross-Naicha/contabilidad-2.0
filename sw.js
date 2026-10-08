'use strict';
// Incrementar la versión al modificar los archivos de la aplicación.
const PREFIX='casa-al-dia-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'v11';
const ASSETS=['index.html','styles.css','receipt-model.js','app.js','receipts.js','workflow.js','card-crypto.js','cards.js','pwa.js','favicon.svg','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const assetUrls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
async function appHTML(response){
 const html=await response.text();
 // Live Server agrega un script que recarga al cambiar archivos. No forma parte de la PWA.
 const clean=html.replace(/<!-- Code injected by live-server -->\s*<script>[\s\S]*?<\/script>/g,'');
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');
 return new Response(clean,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
 const index=new URL('index.html',self.registration.scope).href;
 const response=await cache.match(index);if(!response)throw Error('No se pudo preparar la pantalla sin conexión.');
 await cache.put(index,await appHTML(response));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const root=new URL(self.registration.scope);
 // Solo la pantalla y sus recursos; nunca respaldos, PDFs ni enlaces de proveedores.
 const navigation=request.mode==='navigate'&&(url.pathname===root.pathname||url.pathname===new URL('index.html',root).pathname);
 url.search='';url.hash='';
 if(!navigation&&!assetUrls.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(navigation?new URL('index.html',root).href:url.href);
  if(cached)return cached;
  const response=await fetch(request);return navigation&&response.ok?appHTML(response):response;
 })());
});
