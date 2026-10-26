'use strict';
const KEY = 'casa-al-dia-v1';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => new Intl.NumberFormat('es-AR', {style:'currency',currency:'ARS',maximumFractionDigits:2}).format(v);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const date = v => new Date(v+'T12:00:00').toLocaleDateString('es-AR');
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v+'T12:00:00')) && new Date(v+'T12:00:00').toISOString().slice(0,10) === v;
const safeUrl = v => { try { const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
let state = {version:1,services:[],bills:[]};
function serviceLabel(s){return s.entity ? `${s.name} · ${s.entity}` : s.name;}
function backupData(){return {...state,services:state.services.map(({password,...service})=>service)};}
function syncAuthFields(){const google=$('#service-form').elements.authMethod.value==='google';$('#username-field').hidden=google;$('#password-field').hidden=google;$('#password-help').hidden=google;$('#google-access-help').hidden=!google;$('#service-form').elements.username.disabled=google;$('#service-form').elements.password.disabled=google;}
let feedbackContext=null;
const dialogFeedbackOrigins=new Map();
function feedbackScope(element){
 if(!(element instanceof Element))return null;
 const card=element.closest('[data-bill-card],[data-service-card],.vault-card');
 if(card){
  if(card.dataset.billCard)return {selector:`[data-bill-card="${CSS.escape(card.dataset.billCard)}"]`};
  if(card.dataset.serviceCard)return {selector:`[data-service-card="${CSS.escape(card.dataset.serviceCard)}"]`};
  return {element:card};
 }
 const dialog=element.closest('dialog');if(dialog)return {selector:'#'+dialog.id};
 const panel=element.closest('section[id$="-panel"]');return panel?{selector:'#'+panel.id}:null;
}
function captureFeedback(event){
 const next=feedbackScope(event.target);
 if(event.target.closest('dialog')){
  if(next?.selector&&!dialogFeedbackOrigins.has(next.selector)&&feedbackContext?.selector!==next.selector)dialogFeedbackOrigins.set(next.selector,feedbackContext);
 }else dialogFeedbackOrigins.clear();
 feedbackContext=next;
}
document.addEventListener('click',captureFeedback,true);
document.addEventListener('submit',captureFeedback,true);
document.addEventListener('change',captureFeedback,true);
function setFeedback(target,message,kind='error'){
 target.textContent=message;target.dataset.feedbackKind=kind;target.setAttribute('role',kind==='error'?'alert':'status');target.hidden=!message;
}
// Also covers messages written directly by forms and the update controls.
const timedFeedbackSelector='.context-feedback,.bill-feedback,#notice,#cards-feedback,#pwa-status,#receipt-types-feedback,#receipt-template-error,#receipt-error,#card-form-error,#workflow-feedback,#process-feedback,#process-card-feedback,#process-note-status';
const feedbackTimers=new WeakMap();
function timeFeedback(target){
 const previous=feedbackTimers.get(target);
 if(previous){clearTimeout(previous.timer);if(previous.animation){previous.animation.onfinish=null;previous.animation.cancel();}}
 feedbackTimers.delete(target);
 if(!target.textContent.trim()){target.hidden=true;return;}
 target.hidden=false;
 const entry={timer:null,animation:null};feedbackTimers.set(target,entry);
 entry.timer=setTimeout(()=>{
  if(!target.isConnected){feedbackTimers.delete(target);return;}
  const style=getComputedStyle(target);
  entry.animation=target.animate([
   {opacity:1,height:style.height,paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,marginTop:style.marginTop,marginBottom:style.marginBottom,borderTopWidth:style.borderTopWidth,borderBottomWidth:style.borderBottomWidth},
   {opacity:0,height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px',borderTopWidth:'0px',borderBottomWidth:'0px'}
  ],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:350,easing:'ease-in-out',fill:'forwards'});
  entry.animation.onfinish=()=>{target.hidden=true;target.textContent='';entry.animation.cancel();feedbackTimers.delete(target);};
 },10000);
}
const feedbackObserver=new MutationObserver(records=>{
 const targets=new Set();
 for(const record of records){
  const element=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
  const target=element?.closest(timedFeedbackSelector);if(target)targets.add(target);
  for(const node of record.addedNodes){if(node.nodeType!==Node.ELEMENT_NODE)continue;if(node.matches(timedFeedbackSelector))targets.add(node);node.querySelectorAll(timedFeedbackSelector).forEach(item=>targets.add(item));}
 }
 targets.forEach(timeFeedback);
});
feedbackObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
document.querySelectorAll(timedFeedbackSelector).forEach(timeFeedback);
function notify(message,context=feedbackContext,kind='error'){
 let scope=context?.selector?document.querySelector(context.selector):context?.element;
 if(scope?.matches('dialog')&&!scope.open){const origin=dialogFeedbackOrigins.get(context.selector);scope=origin?.selector?document.querySelector(origin.selector):origin?.element;}
 if(!scope?.isConnected)scope=[...document.querySelectorAll('dialog[open]')].at(-1)||document.querySelector('section[id$="-panel"]:not([hidden])');
 if(!scope){setFeedback($('#notice'),message,kind);return;}
 let target=scope.matches('[data-bill-card]')?scope.querySelector('.bill-feedback'):scope.querySelector(':scope > .context-feedback,:scope > form > .context-feedback,:scope > .process-scroll-content > .context-feedback');
 if(!target){target=document.createElement('p');target.className='context-feedback';target.setAttribute('role','status');target.setAttribute('aria-live','polite');(scope.querySelector(':scope > form,:scope > .process-scroll-content')||scope).appendChild(target);}
 setFeedback(target,message,kind);$('#notice').textContent='';
}
function abbreviation(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3).padEnd(3,'X');}
function periodLabel(period){const [year,cycle]=period.split('-');return cycle.startsWith('B')?`${Number(cycle.slice(1))}/${year} (bimestral)`:`${cycle}/${year}`;}
function usesBimonthlyPeriods(service){return /\bEDET\b/i.test(service?.entity||'');}
function syncBillPeriod(){const f=$('#bill-form'),bimonthly=f.elements.periodMode.value==='bimonthly';$('#monthly-period').hidden=bimonthly;$('#bimonthly-year').hidden=!bimonthly;$('#bimonthly-cycle').hidden=!bimonthly;f.elements.period.required=!bimonthly;f.elements.period.disabled=bimonthly;f.elements.periodYear.required=bimonthly;f.elements.periodYear.disabled=!bimonthly;f.elements.periodCycle.disabled=!bimonthly;}
function selectServicePeriod(){const f=$('#bill-form'),service=state.services.find(s=>s.id===f.elements.serviceId.value);f.elements.periodMode.value=usesBimonthlyPeriods(service)?'bimonthly':'monthly';syncBillPeriod();}
function codePrefix(b,services){const service=services.find(s=>s.id===b.serviceId);return `${abbreviation(service.name)}-${abbreviation(service.entity)}-${b.period.replace('-B','').replace('-','')}`;}
function assignCodes(bills,services,counters){
 const used=new Set();
 for(const b of bills){if(!b.documentCode)continue;if(!/^[A-Z]{3}-[A-Z]{3}-\d{4}(0[1-9]|1[0-2])-(0[1-9]|[1-9]\d)$/.test(b.documentCode)||used.has(b.documentCode))throw Error('Código de documento inválido o duplicado.');used.add(b.documentCode);const prefix=b.documentCode.slice(0,-3);counters[prefix]=Math.max(counters[prefix]||0,Number(b.documentCode.slice(-2)));}
 for(const b of bills){if(b.documentCode)continue;const prefix=codePrefix(b,services),number=(counters[prefix]||0)+1;if(number>99)throw Error('Se alcanzaron los 99 códigos para estas abreviaturas y período. No se guardó el cambio.');b.documentCode=`${prefix}-${String(number).padStart(2,'0')}`;counters[prefix]=number;}
}
const MAX_REFERENCE=26*26*26*999;
function bankReference(number){if(!Number.isInteger(number)||number<1||number>MAX_REFERENCE)throw Error('Se alcanzó el límite de referencias bancarias.');let group=Math.floor((number-1)/999);const suffix=String((number-1)%999+1).padStart(3,'0');let letters='';for(let i=0;i<3;i++){letters=String.fromCharCode(65+group%26)+letters;group=Math.floor(group/26);}return letters+suffix;}
function referenceNumber(reference){if(!/^[A-Z]{3}(00[1-9]|0[1-9]\d|[1-9]\d{2})$/.test(reference))throw Error('Referencia bancaria inválida.');let group=0;for(const letter of reference.slice(0,3))group=group*26+letter.charCodeAt(0)-65;return group*999+Number(reference.slice(3));}
function assignReferences(bills,counter){let high=Number.isInteger(counter)&&counter>=0&&counter<=MAX_REFERENCE?counter:0;const used=new Set();for(const b of bills){if(!b.bankReference)continue;const n=referenceNumber(b.bankReference);if(used.has(b.bankReference))throw Error('Referencia bancaria duplicada.');used.add(b.bankReference);high=Math.max(high,n);}for(const b of bills){if(!b.bankReference)b.bankReference=bankReference(++high);}return high;}
function documentName(b,type,extension){
 const service=state.services.find(s=>s.id===b.serviceId),template=(state.receiptTypes||[]).find(t=>t.id===service?.receiptTypeId);
 const suffix=extension||(type==='PAG'?(b.receipt?.extension||template?.extension||'pdf'):'pdf');
 return b.documentCode+'-'+b.bankReference+'-'+type+'.'+suffix;
}
const STEP_TYPES=['web','web-number','user','password','number','google','invoice','invoice-pdf','fac','reference','cards','pay','receipt','receipt-pdf','pag','message','custom'];
function normalizeWorkflow(steps){if(!Array.isArray(steps))return null;return steps.slice(0,40).filter(x=>x&&STEP_TYPES.includes(x.type)).map((x,index)=>({id:typeof x.id==='string'&&x.id?x.id.slice(0,100):`legacy-${index}-${x.type}`,type:x.type,text:typeof x.text==='string'?x.text.slice(0,300):'',note:typeof x.note==='string'?x.note.slice(0,1000):''}));}
function normalizeProcess(p){if(!p||!Array.isArray(p.steps))return null;const steps=normalizeWorkflow(p.steps);if(!steps.length)return null;const index=Number.isInteger(p.index)?normalizeWorkflow(p.steps.slice(0,40).slice(0,Math.max(0,p.index))).length:0;return {steps,index:Math.min(index,steps.length),billId:typeof p.billId==='string'?p.billId:''};}
function validate(data){
 if(!data || data.version !== 1 || !Array.isArray(data.services) || !Array.isArray(data.bills)) throw Error('Formato de archivo inválido.');
 const receiptTypes=normalizeReceiptTypes(data.receiptTypes);
 const services = data.services.map(s => { if(!s || typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !s.name.trim()) throw Error('Servicio inválido.'); return {id:s.id,receiptTypeId:receiptTypes.some(t=>t.id===s.receiptTypeId)?s.receiptTypeId:'',name:s.name.slice(0,80),serviceNumber:typeof s.serviceNumber==='string'?s.serviceNumber.slice(0,100):'',entity:typeof s.entity==='string'?s.entity.slice(0,100):'',authMethod:s.authMethod==='google'?'google':'credentials',autoCopy:['username','serviceNumber'].includes(s.autoCopy)?s.autoCopy:'none',password:s.authMethod!=='google'&&typeof s.password==='string'?s.password.slice(0,500):'',url:safeUrl(s.url),officialUrl:safeUrl(s.officialUrl),username:s.authMethod!=='google'&&typeof s.username === 'string' ? s.username.slice(0,150) : '',workflow:normalizeWorkflow(s.workflow),process:normalizeProcess(s.process),unit:['kWh','m³','GB','min'].includes(s.unit)?s.unit:''}; });
 if(new Set(services.map(s=>s.id)).size !== services.length) throw Error('Servicios duplicados.');
 const bills = data.bills.map(b => { if(b?.nextDue&&(!validDate(b.nextDue)||b.nextDue<=b.due))throw Error('El próximo vencimiento debe ser una fecha posterior al vencimiento de esta factura.');if(!b || typeof b.id !== 'string' || !b.id || !services.some(s=>s.id===b.serviceId) || !validDate(b.due) || !/^\d{4}-(0[1-9]|1[0-2]|B0[1-6])$/.test(b.period) || typeof b.amount !== 'number' || !Number.isFinite(b.amount) || b.amount<0 || (b.consumption != null && (typeof b.consumption !== 'number' || !Number.isFinite(b.consumption) || b.consumption<0)) || (b.paidAt != null && !validDate(b.paidAt))) throw Error('Factura inválida.'); return {id:b.id,receipt:normalizeReceipt(b.receipt),serviceId:b.serviceId,period:b.period,due:b.due,nextDue:b.nextDue||null,amount:b.amount,consumption:b.consumption??null,providerInvoiceCode:typeof b.providerInvoiceCode==='string'?b.providerInvoiceCode.trim().slice(0,100):'',note:typeof b.note==='string'?b.note.slice(0,250):'',paidAt:b.paidAt??null,documentCode:typeof b.documentCode==='string'?b.documentCode:'',bankReference:typeof b.bankReference==='string'?b.bankReference:''}; });
 if(new Set(bills.map(b=>b.id)).size !== bills.length) throw Error('Facturas duplicadas.');
 const codeCounters=Object.create(null);if(data.codeCounters&&typeof data.codeCounters==='object')for(const [prefix,count] of Object.entries(data.codeCounters)){if(/^[A-Z]{3}-[A-Z]{3}-\d{4}(0[1-9]|1[0-2])$/.test(prefix)&&Number.isInteger(count)&&count>=0&&count<=99)codeCounters[prefix]=count;}
 assignCodes(bills,services,codeCounters);
 const referenceCounter=assignReferences(bills,data.referenceCounter);
 return {version:1,services,bills,receiptTypes,codeCounters,referenceCounter,updatedAt:typeof data.updatedAt==='string' && !isNaN(Date.parse(data.updatedAt))?data.updatedAt:null};
}
function save(next){ try { next=validate(next);next.updatedAt=new Date().toISOString(); localStorage.setItem(KEY,JSON.stringify(next)); state=next; render(); return true; } catch(error) { notify(error.message?.startsWith('Se alcanzaron')?error.message:'No se pudo guardar. Revisá el espacio y los permisos del navegador. Descargá un respaldo antes de cerrar.'); return false; } }
function status(b){ if(b.paidAt) return ['paid','Pagada']; const days=Math.round((new Date(b.due+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000); return days<0?['overdue','Vencida']:days===0?['soon','Vence hoy']:days<=7?['soon',`Vence en ${days} día${days===1?'':'s'}`]:['pending','Pendiente']; }
let billServiceFilter='',billStatusFilter='all',historyFilterOrder='services';
function syncPendingMonths(){
 const select=$('#pending-month'),selected=select.value||'all',months=new Set(state.bills.map(b=>b.due.slice(0,7))),current=today().slice(0,7);
 for(let offset=0;offset<13;offset++){const d=new Date(Number(current.slice(0,4)),Number(current.slice(5,7))-1+offset,1);months.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
 if(selected!=='all')months.add(selected);
 select.innerHTML='<option value="all">Todos los meses</option>'+[...months].sort().map(month=>{const label=new Date(month+'-01T12:00:00').toLocaleDateString('es-AR',{month:'long',year:'numeric'});return '<option value="'+month+'">'+(month===current?'Este mes · ':'')+esc(label)+'</option>';}).join('');select.value=selected;
}
function summary(){ const allPending=state.bills.filter(b=>!b.paidAt),month=$('#pending-month').value,pending=allPending.filter(b=>month==='all'||b.due.slice(0,7)===month), overdue=allPending.filter(b=>status(b)[0]==='overdue'), soon=allPending.filter(b=>status(b)[0]==='soon'); $('#summary').innerHTML = `<div class="stat"><span>Total pendiente</span><strong>${money(pending.reduce((a,b)=>a+b.amount,0))}</strong><span>${pending.length} factura${pending.length===1?'':'s'} por pagar${month==='all'?'':' · según vencimiento'}</span></div><div class="stat"><span>Próximos 7 días</span><strong>${soon.length}</strong><span>Incluye las que vencen hoy</span></div><div class="stat"><span>Vencidas</span><strong>${overdue.length}</strong><span>${overdue.length?'Revisar antes de pagar':'Sin pagos atrasados'}</span></div>`; }
const billActionGroups=new Map();
function billActionGroupsHTML(b){
 const active=billActionGroups.get(b.id)||'',id=esc(b.id);
 const button=(group,label)=>`<button type="button" class="secondary bill-group-button" data-bill-group="${group}" data-id="${id}" aria-expanded="${active===group}" aria-controls="bill-${id}-${group}">${label}<span aria-hidden="true">⌄</span></button>`;
 const panel=(group,content)=>`<div class="bill-action-panel ${active===group?'is-open':''}" id="bill-${id}-${group}" data-group-panel="${group}" ${active===group?'':'inert'}><div class="bill-action-panel-inner"><div class="bill-action-panel-content">${content}</div></div></div>`;
 const payment=`<div class="actions"><button class="small ${b.paidAt?'secondary':''}" data-action="pay" data-id="${id}">${b.paidAt?'Deshacer pago':'Marcar pagada'}</button><button class="secondary small" data-action="receipt" data-id="${id}">${b.receipt?'Editar comprobante':'Registrar comprobante'}</button>${b.paidAt?`<button class="secondary small" data-action="message" data-id="${id}">Mensaje</button>`:''}</div>`;
 const copyReference=(label,text,action,missing)=>`<button type="button" class="secondary bill-copy-button" data-action="${action}" data-id="${id}" ${text?'':'disabled'} title="${text?'Hacé clic para copiar '+label.toLowerCase():missing}" aria-label="${text?'Copiar '+label.toLowerCase()+': '+esc(text):missing}">${text?(action==='copy-fac'||action==='copy-pag'?`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/></svg><span>${action==='copy-fac'?'Código factura':'Código comprobante'}</span>`:esc(text)):missing}</button>`;
 const documents=`<div class="actions bill-document-actions"><button class="secondary small" data-action="invoice-pdf" data-id="${id}">Factura PDF</button><button class="secondary small" data-action="receipt-pdf" data-id="${id}" ${b.paidAt&&b.receipt?'':'disabled title="Confirmá el pago y registrá el comprobante para generar la constancia"'}>Constancia PDF</button>${copyReference('Referencia bancaria',b.bankReference,'copy-reference','Sin referencia bancaria')}${copyReference('Factura',b.documentCode?documentName(b,'FAC'):'','copy-fac','Sin nombre de factura')}${copyReference('Comprobante',b.paidAt&&b.documentCode?documentName(b,'PAG'):'','copy-pag','Sin comprobante')}</div>`;
 const options=`<div class="actions"><button class="secondary small" data-action="edit-bill" data-id="${id}">Editar factura</button><button class="small bill-delete" data-action="delete-bill" data-id="${id}">Eliminar</button></div>`;
 return `<div class="bill-action-groups"><div class="bill-group-buttons" role="group" aria-label="Acciones de la factura">${button('payment','Pago')}${button('documents','Documentos')}${button('options','Opciones')}</div>${panel('payment',payment)}${panel('documents',documents)}${panel('options',options)}</div>`;
}
function toggleBillActionGroup(button){
 const bill=button.closest('.bill'),id=button.dataset.id,group=button.dataset.billGroup,active=billActionGroups.get(id)===group?'':group;
 if(active)billActionGroups.set(id,active);else billActionGroups.delete(id);
 bill.querySelectorAll('[data-bill-group]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.billGroup===active)));
 bill.querySelectorAll('[data-group-panel]').forEach(panel=>{const open=panel.dataset.groupPanel===active;panel.classList.toggle('is-open',open);panel.inert=!open;});
}
function billDetailsHTML(b){ const s=state.services.find(s=>s.id===b.serviceId); const previous=state.bills.filter(x=>x.serviceId===b.serviceId && x.period.includes('-B')===b.period.includes('-B') && x.period<b.period).sort((a,b)=>b.period.localeCompare(a.period))[0]; const change=previous?.amount>0?((b.amount-previous.amount)/previous.amount*100):null;
 return `<article class="bill">${b.providerInvoiceCode||b.nextDue||b.paidAt?`<div class="bill-detail-meta">${b.providerInvoiceCode?`<div class="meta">Factura del proveedor: <strong>${esc(b.providerInvoiceCode)}</strong></div>`:''}${b.nextDue?`<div class="meta">Próximo vencimiento anunciado: <strong>${date(b.nextDue)}</strong></div>`:''}${b.paidAt?`<div class="meta">Pagada el <strong>${date(b.paidAt)}</strong></div>`:''}</div>`:''}${b.consumption!==null?`<p>Consumo: <strong>${esc(b.consumption)} ${esc(s.unit)}</strong></p>`:''}${change!==null?`<p class="meta">${change>=0?'+':''}${change.toFixed(1)}% respecto del período anterior registrado</p>`:''}${receiptSummaryHTML(b)}${b.note?`<p>${esc(b.note)}</p>`:''}${billActionGroupsHTML(b)}<p class="bill-feedback" role="alert" hidden></p></article>`;
}
const expandedBillIds=new Set();
function billHTML(b){
 const s=state.services.find(s=>s.id===b.serviceId),[kind,label]=status(b);
 return '<details class="bill-content-row bill-disclosure bill-disclosure-card" data-bill-card="'+esc(b.id)+'" '+(expandedBillIds.has(b.id)?'open':'')+'><summary title="Mostrar u ocultar detalles de la factura"><span class="bill-content-mark" aria-hidden="true">'+esc(s.name.charAt(0).toUpperCase())+'</span><span class="bill-content-name"><strong>'+esc(s.name)+'</strong><span class="bill-period-tag" title="Período de la factura">'+esc(periodLabel(b.period))+'</span></span><span class="bill-summary-metrics"><span class="bill-content-due">Vence '+date(b.due)+'</span><span class="badge '+kind+'">'+label+'</span><strong class="bill-content-amount">'+money(b.amount)+'</strong></span></summary><div class="bill-content-detail">'+billDetailsHTML(b)+'</div></details>';
}
function list(bills,empty){return bills.length?bills.sort((a,b)=>a.due.localeCompare(b.due)).map(billHTML).join(''):`<div class="empty">${empty}</div>`;}
const billAnimations=new WeakMap();
function toggleHistoryCard(card){
 const id=card.dataset.billCard,expand=!expandedBillIds.has(id),from=card.getBoundingClientRect().height;
 if(expand)expandedBillIds.add(id);else expandedBillIds.delete(id);
 billAnimations.get(card)?.cancel();card.open=expand;
 const to=card.getBoundingClientRect().height;
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!card.animate)return;
 card.open=true;
 const animation=card.animate([{height:from+'px'},{height:to+'px'}],{duration:260,easing:'ease-in-out'});
 billAnimations.set(card,animation);
 animation.onfinish=()=>{if(billAnimations.get(card)!==animation)return;card.open=expand;billAnimations.delete(card);};
}
function filteredHistoryBills(filter){return state.bills.filter(b=>(!billServiceFilter||b.serviceId===billServiceFilter)&&(filter==='all'||(filter==='paid'?!!b.paidAt:!b.paidAt)));}
function renderHistoryFilterOrder(){
 const rows=$('#history-filter-rows'),service=$('#bill-service-filters'),status=$('#bill-status-filters'),first=historyFilterOrder==='services'?service:status;
 if(rows.firstElementChild!==first)rows.prepend(first);
 const description=historyFilterOrder==='services'?'Intercambiar filas: poner estados primero':'Intercambiar filas: poner servicios primero';
 $('#swap-history-filters').setAttribute('aria-label',description);$('#swap-history-filters').title=description;
 status.querySelectorAll('[data-filter-status]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filterStatus===billStatusFilter)));
}
function setupHistoryFilters(){
 try{historyFilterOrder=localStorage.getItem('casa-history-filter-order')==='status'?'status':'services';}catch{}
 $('#swap-history-filters').addEventListener('click',()=>{historyFilterOrder=historyFilterOrder==='services'?'status':'services';try{localStorage.setItem('casa-history-filter-order',historyFilterOrder);}catch{}renderHistoryFilterOrder();});
 $('#bill-status-filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter-status]');if(!button)return;billStatusFilter=button.dataset.filterStatus;render();});
}
function renderBillServiceFilters(){
 if(!state.services.some(s=>s.id===billServiceFilter))billServiceFilter='';
 $('#bill-service-filters').innerHTML=state.services.map(s=>'<button type="button" class="secondary small" data-filter-service="'+esc(s.id)+'" aria-pressed="'+String(s.id===billServiceFilter)+'">'+esc(s.name)+'</button>').join('');
}
function render(){renderHistoryFilterOrder();renderBillServiceFilters();syncPendingMonths();summary(); const filter=billStatusFilter; $('#bills').innerHTML=list(filteredHistoryBills(filter),'No hay facturas en esta vista. Registrá una para empezar.');
 $('#services').innerHTML=state.services.length?state.services.map(serviceHTML).join(''):'<div class="empty">Agregá tu primer servicio con su enlace web.</div>';
}
function nextDueAnnouncement(serviceId){
 const latest=state.bills.filter(b=>b.serviceId===serviceId).reduce((current,b)=>!current||b.due>current.due||(b.due===current.due&&b.period>=current.period)?b:current,null);
 return latest?.nextDue?latest:null;
}
function serviceDueClass(due){const current=today();return due<=current?'overdue':due.slice(0,7)===current.slice(0,7)?'this-month':'upcoming';}
let expandedServiceId='';
let quickAccessServiceId='';
function serviceHTML(s){
 const pending=state.bills.filter(b=>b.serviceId===s.id&&!b.paidAt).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,1);
 const announcement=pending.length?null:nextDueAnnouncement(s.id),expanded=expandedServiceId===s.id,resume=s.process&&s.process.index<s.process.steps.length,action=resume?'Retomar proceso de pago':'Iniciar proceso de pago';
 const icon=body=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
 return `<article class="service content-row service-interactive ${expanded?'is-expanded':''}" data-service-card="${esc(s.id)}" tabindex="0" aria-label="${esc(serviceLabel(s))}"><button class="service-mark service-toggle" type="button" aria-expanded="${expanded}" aria-controls="service-actions-${esc(s.id)}" aria-label="Mostrar u ocultar acciones de ${esc(serviceLabel(s))}" title="Mostrar u ocultar acciones">${esc(s.name.charAt(0).toUpperCase())}</button><div class="service-info"><h3><button type="button" class="service-history-link" data-service-history="${esc(s.id)}" title="Ver todas las facturas de este servicio">${esc(s.name)}</button></h3><div class="service-entity">${s.url?`<a class="service-provider-link" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" title="${esc(s.url)}">${esc(s.entity||'Entidad sin completar')}</a>`:esc(s.entity||'Entidad sin completar')}</div><div class="service-details"><span>N.º de servicio: <strong>${esc(s.serviceNumber||'Sin registrar')}</strong></span></div></div><div class="service-trailing"><div class="service-labels">${pending.map(b=>`<span class="service-next-due ${serviceDueClass(b.due)}">Factura pendiente: ${money(b.amount)} · vence el ${date(b.due)}</span>`).join('')}${announcement?`<span class="service-next-due ${serviceDueClass(announcement.nextDue)}" title="Próximo vencimiento · pendiente de registrar" aria-label="Próximo vencimiento: ${date(announcement.nextDue)} · pendiente de registrar">${date(announcement.nextDue)}</span>`:''}</div><div class="actions service-actions" id="service-actions-${esc(s.id)}" ${expanded?'':'inert'}><button class="service-process-button" type="button" data-action="start-process" data-id="${esc(s.id)}" aria-label="${action}" title="${action}">${icon(resume?'<path d="M8 5v14M16 5v14"/>':'<path d="m9 5 10 7-10 7Z"/>')}</button><button class="reset-process" type="button" data-action="reset-process" data-id="${esc(s.id)}" aria-label="Reiniciar proceso de ${esc(serviceLabel(s))}" title="Reiniciar proceso">${icon('<path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/>')}</button><details class="service-menu"><summary aria-label="Opciones de ${esc(serviceLabel(s))}" title="Opciones del servicio">${icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</summary><div><button class="text-button" data-action="edit-workflow" data-id="${esc(s.id)}" title="Configurar pasos">Configurar pasos</button><button class="text-button" data-action="edit-service" data-id="${esc(s.id)}" title="Editar servicio">Editar servicio</button><button class="text-button" data-action="delete-service" data-id="${esc(s.id)}" title="Eliminar servicio">Eliminar servicio</button></div></details></div></div>${quickAccessServiceId===s.id?quickAccessHTML(s):''}</article>`;
}
function toggleServiceCard(id){
 expandedServiceId=expandedServiceId===id?'':id;
 document.querySelectorAll('[data-service-card]').forEach(card=>{const expanded=card.dataset.serviceCard===expandedServiceId;card.classList.toggle('is-expanded',expanded);card.querySelector('.service-toggle').setAttribute('aria-expanded',String(expanded));card.querySelector('.service-actions').inert=!expanded;if(!expanded)card.querySelectorAll('.service-menu').forEach(menu=>menu.open=false);});
}

function switchView(view){
 $('#services-panel').hidden=view!=='services';$('#bills-panel').hidden=view!=='bills';$('#cards-panel').hidden=view!=='cards';
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
function paymentMessage(b){
 const service=state.services.find(s=>s.id===b.serviceId);
 return `Hola, mamá 😊 Ya pagué ${serviceLabel(service)}.\n\nPeríodo: ${periodLabel(b.period)}\nImporte: ${money(b.amount)}\nFecha de pago: ${date(b.paidAt)}\nVencimiento de la factura: ${date(b.due)}\n\nEste pago ya quedó registrado. ✅`;
}
function openMessage(id){ const bill=state.bills.find(b=>b.id===id); if(!bill?.paidAt)return; $('#payment-message').value=paymentMessage(bill); $('#message-dialog').showModal(); }
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function copy(text,context=feedbackContext){ if(!text){notify('Primero ingresá el dato que querés copiar.',context);return;} try{await navigator.clipboard.writeText(text);notify('Copiado al portapapeles.',context,'success');return true;}catch{notify('El navegador no permitió copiar. Seleccioná el texto y copialo manualmente.',context);} }
function openBill(id){if(!state.services.length){notify('Agregá un servicio antes de registrar una factura.');$('#service-dialog').showModal();return;} const f=$('#bill-form');$('#duplicate-bill-actions')?.remove();f.reset();f.elements.nextDue.setCustomValidity('');f.elements.serviceId.innerHTML=state.services.map(s=>`<option value="${esc(s.id)}">${esc(serviceLabel(s))}</option>`).join('');f.elements.id.value='';f.elements.period.value=today().slice(0,7);f.elements.periodYear.value=today().slice(0,4);f.elements.periodCycle.value='01';selectServicePeriod();if(id){const b=state.bills.find(b=>b.id===id);for(const k of ['id','serviceId','period','due','nextDue','amount','consumption','providerInvoiceCode','note']) f.elements[k].value=b[k]??'';f.elements.periodMode.value=b.period.includes('-B')?'bimonthly':'monthly';if(b.period.includes('-B')){f.elements.periodYear.value=b.period.slice(0,4);f.elements.periodCycle.value=b.period.slice(-2);}syncBillPeriod();}$('#bill-title').textContent=id?'Editar factura':'Registrar factura';$('#bill-dialog').showModal();}
async function init(){
 setupHistoryFilters();
 $('#bills').addEventListener('click',event=>{const group=event.target.closest('[data-bill-group]');if(group){toggleBillActionGroup(group);return;}const summary=event.target.closest('summary');if(!summary||!summary.parentElement.matches('details[data-bill-card]'))return;event.preventDefault();toggleHistoryCard(summary.parentElement);});

 $('#services').addEventListener('click',event=>{const history=event.target.closest('[data-service-history]');if(history){billServiceFilter=history.dataset.serviceHistory;billStatusFilter='all';render();switchView('bills');$('#bills-panel').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}const card=event.target.closest('[data-service-card]');if(!card)return;if(event.target.closest('.service-toggle')||!event.target.closest('button,summary,details,a,input,select'))toggleServiceCard(card.dataset.serviceCard);});
 $('#services').addEventListener('keydown',event=>{if(event.target.matches('[data-service-card]')&&['Enter',' '].includes(event.key)){event.preventDefault();toggleServiceCard(event.target.dataset.serviceCard);}});

 $('#period-mode').addEventListener('change',syncBillPeriod);$('#bill-form').elements.serviceId.addEventListener('change',selectServicePeriod);

 try{const data=localStorage.getItem(KEY);if(data){const original=JSON.parse(data);state=validate(original);if(original.bills.some(b=>!b.bankReference))localStorage.setItem(KEY,JSON.stringify(state));}}catch{notify('No se pudieron leer los registros guardados. Restaurá un respaldo; el archivo original no se modificó.');}
 $('#pending-month').addEventListener('change',summary);
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));
 $('#auth-method').addEventListener('change',syncAuthFields);syncAuthFields();render();$('#bill-service-filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter-service]');if(!button)return;billServiceFilter=billServiceFilter===button.dataset.filterService?'':button.dataset.filterService;render();});$('#new-bill').onclick=()=>openBill();$('#new-service').onclick=()=>{$('#service-form').reset();$('#service-form').elements.id.value='';syncReceiptTypeOptions('');syncAuthFields();$('#service-dialog').showModal();};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#access-dialog').addEventListener('close',()=>{$('#temporary-password').value='';});$('#copy-password').onclick=()=>copy($('#temporary-password').value);
 $('#service-form').onsubmit=e=>{e.preventDefault();const f=e.target, raw=f.elements.url.value.trim(),url=safeUrl(raw),officialRaw=f.elements.officialUrl.value.trim(),officialUrl=safeUrl(officialRaw);if((raw&&!url)||(officialRaw&&!officialUrl)){notify('El enlace debe comenzar con https:// o http://.');return;}const s={id:f.elements.id.value||crypto.randomUUID(),name:f.elements.name.value.trim(),receiptTypeId:f.elements.receiptTypeId.value,entity:f.elements.entity.value.trim(),authMethod:f.elements.authMethod.value,autoCopy:f.elements.autoCopy.value,password:f.elements.authMethod.value==='google'?'':f.elements.password.value,serviceNumber:f.elements.serviceNumber.value.trim(),url,officialUrl,username:f.elements.authMethod.value==='google'?'':f.elements.username.value.trim(),unit:f.elements.unit.value,workflow:state.services.find(x=>x.id===f.elements.id.value)?.workflow??null,process:state.services.find(x=>x.id===f.elements.id.value)?.process??null};if(!s.name)return;const next=structuredClone(state);const index=next.services.findIndex(x=>x.id===s.id);if(index<0)next.services.push(s);else next.services[index]=s;if(save(next))$('#service-dialog').close();};
 $('#bill-form').addEventListener('input',()=>$('#bill-form').elements.nextDue.setCustomValidity(''));
 $('#bill-form').onsubmit=e=>{e.preventDefault();const f=e.target;if(f.elements.nextDue.value&&f.elements.nextDue.value<=f.elements.due.value){f.elements.nextDue.setCustomValidity('El próximo vencimiento debe ser posterior al vencimiento de esta factura.');f.elements.nextDue.reportValidity();return;}const old=state.bills.find(b=>b.id===f.elements.id.value),b={id:old?.id||crypto.randomUUID(),serviceId:f.elements.serviceId.value,period:f.elements.periodMode.value==='bimonthly'?`${f.elements.periodYear.value}-B${f.elements.periodCycle.value}`:f.elements.period.value,due:f.elements.due.value,nextDue:f.elements.nextDue.value||null,amount:Number(f.elements.amount.value),consumption:f.elements.consumption.value===''?null:Number(f.elements.consumption.value),providerInvoiceCode:f.elements.providerInvoiceCode.value.trim(),note:f.elements.note.value.trim(),paidAt:old?.paidAt??null,documentCode:old?.documentCode||'',receipt:old?.receipt??null,bankReference:old?.bankReference||''};const duplicate=state.bills.find(x=>x.id!==b.id&&x.serviceId===b.serviceId&&x.providerInvoiceCode?.trim().toLocaleUpperCase()===b.providerInvoiceCode.toLocaleUpperCase());if(duplicate){showDuplicateBill(duplicate);return;}if(state.bills.some(x=>x.id!==b.id&&x.serviceId===b.serviceId&&x.period===b.period)&&!confirm('Ya hay otra factura de este servicio para el mismo período. ¿Guardar esta factura adicional?'))return;const next=structuredClone(state);if(old)next.bills[next.bills.findIndex(x=>x.id===old.id)]=b;else next.bills.push(b);try{validate(next);if(save(next)){if(typeof workflowBillSaved==='function')workflowBillSaved(b.id);$('#bill-dialog').close();}}catch(error){notify(error.message);}};
 document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const id=btn.dataset.id, action=btn.dataset.action,s=state.services.find(s=>s.id===id);if(action==='receipt'||action==='receipt-pdf'||action==='invoice-pdf')return;if(action==='start-process'||action==='edit-workflow'||action==='reset-process')return;if(action==='copy-user')return copy(s.username);if(action==='copy-service-password')return copy(s.password);if(action==='copy-number')return copy(s.serviceNumber);if(action==='access'){$('#access-title').textContent=serviceLabel(s);$('#temporary-password').value=s.password||'';$('#access-dialog').showModal();return;}if(action==='edit-service'){const f=$('#service-form');for(const k of ['id','name','entity','authMethod','password','serviceNumber','url','officialUrl','username','unit','autoCopy'])f.elements[k].value=s[k]??(k==='authMethod'?'credentials':k==='autoCopy'?'none':'');syncReceiptTypeOptions(s.receiptTypeId);syncAuthFields();$('#service-dialog').showModal();return;}if(action==='copy-reference')return copy(state.bills.find(b=>b.id===id).bankReference);if(action==='copy-fac'||action==='copy-pag'){const bill=state.bills.find(b=>b.id===id);if(action==='copy-pag'&&!bill.paidAt)return;return copy(documentName(bill,action==='copy-fac'?'FAC':'PAG'));}if(action==='edit-bill')return openBill(id);if(action==='message')return openMessage(id);const next=structuredClone(state);if(action==='pay'){const b=next.bills.find(b=>b.id===id);b.paidAt=b.paidAt?null:today();}if(action==='delete-bill'){if(!confirm('¿Eliminar esta factura?'))return;next.bills=next.bills.filter(b=>b.id!==id);}if(action==='delete-service'){if(next.bills.some(b=>b.serviceId===id)){notify('Este servicio tiene facturas. Eliminá sus facturas antes de borrar el servicio.');return;}if(!confirm('¿Eliminar este servicio?'))return;next.services=next.services.filter(s=>s.id!==id);}if(save(next)&&action==='pay'&&next.bills.find(b=>b.id===id)?.paidAt)openMessage(id);});
 $('#backup').onclick=()=>download(backupData(),'casa-respaldo.json');$('#copy-message').onclick=()=>copy($('#payment-message').value);$('#message-dialog').addEventListener('close',()=>{$('#payment-message').value='';});
 $('#restore').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const data=validate(JSON.parse(await file.text()));if(confirm('¿Reemplazar los registros de este navegador por el respaldo?'))if(save(data))notify('Respaldo restaurado.',feedbackContext,'success');}catch(error){notify(`No se restauró el archivo: ${error.message}`);}finally{e.target.value='';}};
}
init();



function showDuplicateBill(bill){
 $('#duplicate-bill-actions')?.remove();
 const container=document.createElement('div');container.id='duplicate-bill-actions';
 const message=document.createElement('p');message.textContent='Ya existe una factura de este servicio con ese código del proveedor. Podés usarla o editarla.';message.setAttribute('role','alert');message.dataset.feedbackKind='error';container.appendChild(message);
 for(const [label,edit] of [['Usar factura existente',false],['Editar factura existente',true]]){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;
  button.onclick=()=>{if(edit){openBill(bill.id);if(typeof workflowBillContext!=='undefined'&&workflowBillContext)$('#bill-form').elements.serviceId.disabled=true;}else{workflowBillSaved(bill.id);$('#bill-dialog').close();}};
  container.appendChild(button);
 }
 $('#bill-form').appendChild(container);container.scrollIntoView({block:'nearest',behavior:'smooth'});
}

function quickAccessHTML(service){
 const button=(label,action,value)=>`<button type="button" class="secondary" data-action="${action}" data-id="${esc(service.id)}" ${value?'':'disabled'}>${label}</button>`;
 return `<div class="service-quick-access"><div class="section-heading"><strong>Acceso al proveedor</strong><button type="button" class="text-button" data-close-quick-access aria-label="Cerrar accesos">✕</button></div><div class="quick-access-buttons">${service.authMethod==='google'?'<span class="quick-google">Acceso con Google</span>':button('Copiar usuario','copy-user',service.username)+button('Copiar contraseña','copy-service-password',service.password)}${button('Copiar número de servicio','copy-number',service.serviceNumber)}</div></div>`;
}
$('#services').addEventListener('click',event=>{
 if(event.target.closest('[data-close-quick-access]')){quickAccessServiceId='';render();return;}
 const link=event.target.closest('.service-provider-link');if(!link)return;
 event.preventDefault();
 const service=state.services.find(s=>s.id===link.closest('[data-service-card]').dataset.serviceCard);if(!service)return;
 const context=feedbackScope(link);
 quickAccessServiceId=service.id;
 render();
 if(service.autoCopy==='serviceNumber'||(service.autoCopy==='username'&&service.authMethod!=='google'))copy(service[service.autoCopy],context);
 window.open(service.url,'_blank','noopener,noreferrer');
});
