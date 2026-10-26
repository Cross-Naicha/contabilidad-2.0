'use strict';
(()=>{
 document.querySelector('#open-settings').addEventListener('click',()=>document.querySelector('#settings-dialog').showModal());
 const install=document.querySelector('#pwa-install'),update=document.querySelector('#pwa-update'),status=document.querySelector('#pwa-status'),headerUpdate=document.querySelector('#header-update'),search=document.querySelector('#pwa-check');
 const floatingUpdate=document.querySelector('#floating-update'),floatingStatus=document.querySelector('#floating-update-status');
 let floatingRequest=false;
 let floatingMessageTimer=null,floatingMessageAnimation=null;
 const reportFloating=(message,kind)=>{
  clearTimeout(floatingMessageTimer);
  if(floatingMessageAnimation){floatingMessageAnimation.onfinish=null;floatingMessageAnimation.cancel();floatingMessageAnimation=null;}
  floatingStatus.textContent=message;floatingStatus.hidden=!message;floatingStatus.dataset.feedbackKind=kind;
  floatingStatus.setAttribute('role',kind==='error'?'alert':'status');
  if(!message)return;
  floatingMessageTimer=setTimeout(()=>{
   const height=floatingStatus.getBoundingClientRect().height;
   const animation=floatingStatus.animate([
    {opacity:1,height:height+'px',paddingTop:'8px',paddingBottom:'8px',marginTop:'0px'},
    {opacity:0,height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'-12px'}
   ],{duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:350,easing:'ease-in-out',fill:'forwards'});
   floatingMessageAnimation=animation;
   animation.onfinish=()=>{floatingStatus.hidden=true;floatingStatus.textContent='';animation.cancel();floatingMessageAnimation=null;};
  },5000);
 };
 const report=(message,kind='info')=>{if(floatingRequest)reportFloating(message,kind);status.textContent=message;status.hidden=!message;status.dataset.feedbackKind=kind;status.setAttribute('role',kind==='error'?'alert':'status');};
 const syncUpdate=()=>{const available=!refreshing&&registration?.waiting?.state==='installed';update.hidden=!available;headerUpdate.hidden=!available;floatingUpdate.classList.toggle('has-update',available);floatingUpdate.title=available?'Actualizar aplicación':'Buscar actualización';floatingUpdate.setAttribute('aria-label',floatingUpdate.title);return available;};
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
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;report('Aplicación instalada.','success');});
 install.addEventListener('click',async()=>{if(!prompt)return;const current=prompt;prompt=null;install.hidden=true;try{await current.prompt();await current.userChoice;}catch{report('Podés instalarla desde el menú del navegador.');}});
 const activateUpdate=()=>{const worker=registration?.waiting;if(!syncUpdate())return;if(!confirm('¿Actualizar la aplicación? Los cambios de formularios que todavía no guardaste se perderán.'))return;refreshing=true;syncUpdate();report('Aplicando actualización…');worker.postMessage({type:'ACTIVATE_UPDATE'});};
 update.addEventListener('click',activateUpdate);headerUpdate.addEventListener('click',activateUpdate);
 const checkForUpdates=async()=>{
  if(!registration){report('No se pudo buscar la actualización. Abrí la app desde localhost o HTTPS.','error');return;}search.disabled=true;report('Buscando actualizaciones…');
  try{
   await registration.update();
   const worker=registration.installing;
   if(worker)await new Promise((resolve,reject)=>{
    const finish=()=>{if(worker.state==='installed'||worker.state==='activated'){cleanup();resolve();}else if(worker.state==='redundant'){cleanup();reject(Error('No se pudo descargar la actualización.'));}};
    const timer=setTimeout(()=>{cleanup();reject(Error('La descarga sigue en curso. Volvé a buscar en unos instantes.'));},15000);
    const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',finish);};worker.addEventListener('statechange',finish);finish();
   });
   report(syncUpdate()?'Hay una actualización disponible.':'La aplicación está actualizada.','success');
  }catch(error){syncUpdate();report(error.message?.startsWith('La descarga')?error.message:'No se pudo buscar la actualización. Comprobá que Live Server esté encendido y volvé a intentar.','error');}finally{search.disabled=false;}
 };
 search.addEventListener('click',()=>{floatingRequest=false;checkForUpdates();});
 floatingUpdate.addEventListener('click',async()=>{floatingRequest=true;floatingUpdate.disabled=true;try{if(!syncUpdate())await checkForUpdates();if(syncUpdate())activateUpdate();}finally{floatingUpdate.disabled=false;floatingRequest=false;}});
 if(!('serviceWorker' in navigator)||!window.isSecureContext){report('Para instalar y actualizar la app, abrila desde localhost o HTTPS.');return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{syncUpdate();if(refreshing)window.location.reload();});
 window.addEventListener('load',async()=>{
  try{
   registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   const check=()=>{if(syncUpdate())report('Hay una actualización disponible.');else if(status.textContent==='Hay una actualización disponible.')report('');};
   const watch=worker=>{if(worker)worker.addEventListener('statechange',check);};
   watch(registration.waiting);watch(registration.installing);check();search.disabled=false;
   registration.addEventListener('updatefound',()=>{watch(registration.installing);check();});
   await navigator.serviceWorker.ready;

  }catch{report('No se pudo preparar la aplicación. Volvé a cargar con Live Server encendido.','error');}
 });
})();

