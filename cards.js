'use strict';
const CardVault=(()=>{
 const storageKey='casa-tarjetas-v1';
 let key=null,salt=null,cards=[],epoch=0,busy=false,timer,pending=null;
 const feedback=text=>{$('#cards-feedback').textContent=text;};
 function stored(){const raw=localStorage.getItem(storageKey);return raw?CardCrypto.envelope(JSON.parse(raw)):null;}
 function validate(data){
  if(!Array.isArray(data)||data.length>50)throw Error('Datos de tarjetas inválidos.');
  const ids=new Set();return data.map(c=>{
   if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.label!=='string'||!c.label.trim()||c.label.length>60||typeof c.number!=='string'||!/^\d{12,19}$/.test(c.number)||typeof c.holder!=='string'||!c.holder.trim()||c.holder.length>100||typeof c.expiry!=='string'||!/^(0[1-9]|1[0-2])\/\d{4}$/.test(c.expiry))throw Error('Datos de tarjetas inválidos.');
   ids.add(c.id);return {id:c.id,label:c.label,number:c.number,holder:c.holder,expiry:c.expiry};
  });
 }
 function touch(){clearTimeout(timer);if(key)timer=setTimeout(()=>lock('Se bloqueó por inactividad.'),300000);}
 function render(){
  let exists=false;try{exists=!!stored();}catch{feedback('No se puede leer la sección cifrada. Conservá un respaldo antes de modificarla.');exists=true;}
  $('#cards-unlock-form').hidden=!!key;$('#cards-unlocked').hidden=!key;$('#cards-lock').hidden=!key;
  $('#cards-confirm-label').hidden=exists||!!pending;$('#cards-confirm').required=!exists&&!pending;
  $('#cards-passphrase').minLength=exists||pending?1:12;
  $('#cards-lock-title').textContent=pending?'Restaurar sección cifrada':exists?'Desbloquear tarjetas':'Crear sección cifrada';
  $('#cards-lock-help').textContent=pending?'Ingresá la clave del respaldo. Se verificará antes de reemplazar tus tarjetas.':exists?'Ingresá tu clave para acceder a las tarjetas.':'Elegí una clave de al menos 12 caracteres. Si la olvidás, no se pueden recuperar las tarjetas.';
  $('#cards-unlock-submit').textContent=pending?'Desbloquear respaldo':exists?'Desbloquear':'Crear sección cifrada';
  $('#cards-cancel-import').hidden=!pending;
  $('#cards-reset').hidden=!exists||!!pending;
  $('#cards-list').innerHTML=key?(cards.length?cards.map(c=>`<article class="vault-card"><h3>${esc(c.label)}</h3><p>•••• •••• •••• ${esc(c.number.slice(-4))}</p><p>${esc(c.holder)} · ${esc(c.expiry)}</p><div class="actions"><button data-card-copy="number" data-card-id="${esc(c.id)}">Copiar número</button><button data-card-copy="holder" data-card-id="${esc(c.id)}">Copiar titular</button><button data-card-copy="expiry" data-card-id="${esc(c.id)}">Copiar vencimiento</button><button class="secondary" data-card-show="${esc(c.id)}">Mostrar vencimiento</button><button class="secondary" data-card-edit="${esc(c.id)}">Editar</button><button class="text-button" data-card-delete="${esc(c.id)}">Eliminar</button></div><div class="card-expiry-display" hidden></div></article>`).join(''):'<p>No agregaste tarjetas todavía.</p>'):'';
  renderInline();
 }
 function renderInline(){
  const container=$('#process-card-vault');if(container.hidden){container.innerHTML='';return;}
  if(!key){container.innerHTML='<form id="process-card-unlock" autocomplete="off"><label>Clave de las tarjetas<input name="passphrase" type="password" required autocomplete="off"></label><button>Desbloquear tarjetas</button></form><p>Si todavía no cargaste tarjetas, pausá el proceso y agregalas en la pestaña Tarjetas.</p><p id="process-card-feedback" role="status"></p>';return;}
  container.innerHTML=(cards.length?cards.map(c=>`<article class="vault-card"><h3>${esc(c.label)}</h3><p>•••• •••• •••• ${esc(c.number.slice(-4))}</p><div class="actions"><button data-card-copy="number" data-card-id="${esc(c.id)}">Copiar número</button><button data-card-copy="holder" data-card-id="${esc(c.id)}">Copiar titular</button><button data-card-copy="expiry" data-card-id="${esc(c.id)}">Copiar vencimiento</button><button class="secondary" data-card-show="${esc(c.id)}">Mostrar vencimiento</button></div><div class="card-expiry-display" hidden></div></article>`).join(''):'<p>No hay tarjetas cargadas. Pausá para agregarlas desde Tarjetas.</p>')+'<button class="text-button" data-inline-lock>Bloquear tarjetas</button><p id="process-card-feedback" role="status"></p>';
 }
 $('#process-card-vault').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const token=epoch,form=e.target,button=form.querySelector('button');button.disabled=true;
  try{const value=stored();if(!value)throw Error('Primero creá y cargá tus tarjetas en la pestaña Tarjetas.');const result=await CardCrypto.unlock(value,form.elements.passphrase.value),clean=validate(result.cards);if(token!==epoch)return;key=result.key;salt=result.salt;cards=clean;render();touch();}
  catch(err){const feedback=$('#process-card-feedback');if(feedback)feedback.textContent=err.name==='OperationError'?'Clave incorrecta o datos dañados.':err.message;}
  finally{form.reset();button.disabled=false;busy=false;}
 });
 $('#process-card-vault').addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button||!key||busy)return;touch();
  if(button.hasAttribute('data-inline-lock')){lock();return;}
  const card=cards.find(c=>c.id===(button.dataset.cardId||button.dataset.cardShow));if(!card)return;
  if(button.dataset.cardShow){showExpiry(button,card);return;}
  if(button.dataset.cardCopy&&await copy(card[button.dataset.cardCopy])){const message=$('#process-card-feedback');if(message)message.textContent='Dato copiado.';}
 });
 function showExpiry(button,card){
  const [month,year]=card.expiry.split('/'),names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const display=button.closest('.vault-card').querySelector('.card-expiry-display');display.hidden=!display.hidden;
  display.innerHTML=display.hidden?'':`<div><span>Mes</span><strong>${esc(month)} · ${names[Number(month)-1]}</strong></div><div><span>Año</span><strong>${esc(year)}</strong></div>`;
  button.textContent=display.hidden?'Mostrar vencimiento':'Ocultar vencimiento';
 }
 function lock(message='Tarjetas bloqueadas.'){
  epoch++;key=null;salt=null;cards=[];clearTimeout(timer);$('#card-dialog').close();$('#card-form').reset();$('#cards-unlock-form').reset();render();feedback(message);
 }
 async function persist(next){const token=epoch,k=key,s=salt;if(!k)throw Error('Desbloqueá las tarjetas.');const clean=validate(next),encrypted=await CardCrypto.encrypt(clean,k,s);if(token!==epoch)throw Error('La sección se bloqueó. Volvé a desbloquearla.');localStorage.setItem(storageKey,JSON.stringify(encrypted));cards=clean;touch();render();}
 $('#cards-unlock-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const token=epoch;$('#cards-unlock-submit').disabled=true;
  try{
   if(!crypto.subtle)throw Error('El cifrado requiere HTTPS o abrir la aplicación en localhost.');
   const password=$('#cards-passphrase').value,value=pending||stored();let result;
   if(value){result=await CardCrypto.unlock(value,password);result.cards=validate(result.cards);}else{
    if(password.length<12||password!==$('#cards-confirm').value)throw Error('Usá al menos 12 caracteres y repetí la misma clave.');
    result=await CardCrypto.create(password);result.cards=[];
   }
   if(token!==epoch)return;
   if(pending&&stored()&&!confirm('¿Reemplazar las tarjetas actuales por las del respaldo?'))return;
   if(pending||!value)localStorage.setItem(storageKey,JSON.stringify(pending||result.stored));
   key=result.key;salt=result.salt;cards=result.cards;pending=null;$('#cards-unlock-form').reset();render();touch();feedback('Tarjetas desbloqueadas.');
  }catch(err){feedback(err.name==='OperationError'?'Clave incorrecta o respaldo dañado.':err.message);}finally{busy=false;$('#cards-unlock-submit').disabled=false;}
 });
 $('#cards-lock').addEventListener('click',()=>lock());
 $('#cards-reset').addEventListener('click',()=>{
  if(busy)return;
  if(!confirm('Se eliminarán todas las tarjetas guardadas en este navegador. Tendrás que crear una clave nueva y volver a cargarlas. Las facturas y los servicios se conservan. ¿Reiniciar tarjetas?'))return;
  try{localStorage.removeItem(storageKey);pending=null;lock('Tarjetas eliminadas. Ahora podés crear una clave nueva.');}catch{feedback('El navegador no permitió reiniciar las tarjetas.');}
 });
 function edit(id){if(!key)return;const f=$('#card-form');f.reset();$('#card-form-error').textContent='';const c=cards.find(c=>c.id===id);if(c)for(const field of ['id','label','number','holder','expiry'])f.elements[field].value=c[field];$('#card-dialog').showModal();touch();}
 $('#cards-add').addEventListener('click',()=>edit());
 $('#card-dialog').addEventListener('close',()=>$('#card-form').reset());
 $('[data-card-close]').addEventListener('click',()=>$('#card-dialog').close());
 $('#card-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const button=e.target.querySelector('button:not([type])');button.disabled=true;
  try{const f=e.target.elements,c={id:f.id.value||crypto.randomUUID(),label:f.label.value.trim(),number:f.number.value.replace(/[\s-]/g,''),holder:f.holder.value.trim(),expiry:f.expiry.value.trim()};await persist([...cards.filter(x=>x.id!==c.id),c]);$('#card-dialog').close();feedback('Tarjeta guardada cifrada.');}catch(err){$('#card-form-error').textContent=err.message;}finally{busy=false;button.disabled=false;}
 });
 $('#cards-list').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||!key||busy)return;touch();
  if(b.dataset.cardShow){const card=cards.find(c=>c.id===b.dataset.cardShow);if(card)showExpiry(b,card);return;}if(b.dataset.cardEdit){edit(b.dataset.cardEdit);return;}
  if(b.dataset.cardCopy){const c=cards.find(c=>c.id===b.dataset.cardId);if(c&&await copy(c[b.dataset.cardCopy]))feedback('Dato copiado.');return;}
  if(b.dataset.cardDelete&&confirm('¿Eliminar esta tarjeta?')){busy=true;try{await persist(cards.filter(c=>c.id!==b.dataset.cardDelete));feedback('Tarjeta eliminada.');}catch(err){feedback(err.message);}finally{busy=false;}}
 });
 $('#cards-export').addEventListener('click',()=>{try{const value=stored();if(!value)throw Error('Primero creá la sección cifrada.');download(value,'casa-tarjetas-cifradas.json');feedback('Respaldo cifrado descargado.');}catch(err){feedback(err.message);}});
 $('#cards-import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||busy)return;try{if(file.size>1000000)throw Error('El respaldo es demasiado grande.');const value=CardCrypto.envelope(JSON.parse(await file.text()));lock('Ingresá la clave del respaldo para verificarlo.');pending=value;render();}catch(err){feedback(err.message);}finally{e.target.value='';}});
 $('#cards-cancel-import').addEventListener('click',()=>{pending=null;lock('Restauración cancelada.');});
 document.addEventListener('pointerdown',touch);document.addEventListener('keydown',touch);
 window.addEventListener('pagehide',()=>lock());window.addEventListener('storage',e=>{if(e.key===storageKey||e.key===null){pending=null;lock('Los datos cambiaron en otra pestaña. Volvé a desbloquearlos.');}});
 render();
 return {renderProcess:renderInline};
})();
