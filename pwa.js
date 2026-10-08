'use strict';
(()=>{
 document.querySelector('#open-settings').addEventListener('click',()=>document.querySelector('#settings-dialog').showModal());
 const install=document.querySelector('#pwa-install'),update=document.querySelector('#pwa-update'),status=document.querySelector('#pwa-status');
 let prompt=null,registration=null,refreshing=false;
 const editedForms=new WeakSet();
 const trackEdit=event=>{const form=event.target.closest('form');if(form)editedForms.add(form);};
 document.addEventListener('input',trackEdit);document.addEventListener('change',trackEdit);
 document.addEventListener('reset',event=>editedForms.delete(event.target));
 window.addEventListener('beforeunload',event=>{
  if(refreshing)return;
  const unsaved=[...document.querySelectorAll('dialog[open] form')].some(form=>editedForms.has(form));
  if(unsaved){event.preventDefault();event.returnValue='';}
 });
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;status.textContent='Aplicación instalada.';});
 install.addEventListener('click',async()=>{if(!prompt)return;const current=prompt;prompt=null;install.hidden=true;try{await current.prompt();await current.userChoice;}catch{status.textContent='Podés instalarla desde el menú del navegador.';}});
 update.addEventListener('click',()=>{if(!registration?.waiting)return;if(!confirm('¿Actualizar la aplicación? Los cambios de formularios que todavía no guardaste se perderán.'))return;refreshing=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});});
 if(!('serviceWorker' in navigator)||!window.isSecureContext){status.textContent='Para instalar la app, abrila desde localhost o HTTPS.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)window.location.reload();});
 window.addEventListener('load',async()=>{
  try{
   registration=await navigator.serviceWorker.register('./sw.js');
   const check=()=>{update.hidden=!registration.waiting;};check();
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',check);});
   await navigator.serviceWorker.ready;
   status.textContent='Lista para usar sin conexión. Las páginas de los proveedores requieren internet.';
  }catch{status.textContent='No se pudo preparar el uso sin conexión. Volvé a cargar con Live Server encendido.';}
 });
})();
