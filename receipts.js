'use strict';
let receiptDraft=null,receiptBillId='',receiptSchema=null,receiptReturn=null;
function syncReceiptTypeOptions(selected=''){
 $('#service-receipt-type').innerHTML='<option value="">Sin asignar</option>'+(state.receiptTypes||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
 $('#service-receipt-type').value=selected||'';
}
function renderReceiptTypes(){
 $('#receipt-types-list').innerHTML=(state.receiptTypes||[]).map(t=>`<article class="receipt-template"><h3>${esc(t.name)}</h3><p>${t.fields.map(f=>esc(f.label)+(f.required?' *':'')).join(' · ')}</p><div class="actions"><button class="secondary small" data-edit-receipt-type="${esc(t.id)}">Editar</button><button class="text-button" data-delete-receipt-type="${esc(t.id)}">Eliminar</button></div></article>`).join('')||'<p>Todavía no creaste tipos de comprobante.</p>';
}
function readTemplateFields(){
 receiptDraft.name=$('#receipt-type-form').elements.templateName.value;
 receiptDraft.fields=[...$('#receipt-template-fields').querySelectorAll('[data-template-field]')].map(row=>({id:row.dataset.templateField,label:row.querySelector('[data-field-label]').value,type:row.querySelector('[data-field-type]').value,required:row.querySelector('[data-field-required]').checked,options:row.querySelector('[data-field-options]').value.split('\n').map(x=>x.trim()).filter(Boolean)}));
}
function renderTemplateFields(){
 $('#receipt-template-fields').innerHTML=receiptDraft.fields.map((f,index)=>`<fieldset class="receipt-field" data-template-field="${esc(f.id)}"><legend>Campo ${index+1}</legend><label>Nombre<input data-field-label required maxlength="80" value="${esc(f.label)}" /></label><div class="form-grid"><label>Formato<select data-field-type>${Object.entries(RECEIPT_FIELD_TYPES).map(([id,label])=>`<option value="${id}" ${f.type===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="checkbox-label"><input type="checkbox" data-field-required ${f.required?'checked':''} /> Obligatorio</label></div><label ${f.type==='select'?'':'hidden'}>Opciones (una por línea)<textarea data-field-options ${f.type==='select'?'required':''} maxlength="5000">${esc((f.options||[]).join('\n'))}</textarea></label><div class="actions"><button type="button" class="text-button" data-receipt-move="-1" data-index="${index}" ${index===0?'disabled':''}>Subir</button><button type="button" class="text-button" data-receipt-move="1" data-index="${index}" ${index===receiptDraft.fields.length-1?'disabled':''}>Bajar</button><button type="button" class="text-button" data-remove-receipt-field="${index}">Quitar campo</button></div></fieldset>`).join('');
}
function openReceiptType(id){
 const existing=(state.receiptTypes||[]).find(t=>t.id===id);
 receiptDraft=existing?structuredClone(existing):{id:crypto.randomUUID(),name:'',fields:[{id:crypto.randomUUID(),label:'Número de operación',type:'text',required:true,options:[]},{id:crypto.randomUUID(),label:'Fecha de pago',type:'date',required:true,options:[]},{id:crypto.randomUUID(),label:'Importe pagado',type:'amount',required:true,options:[]}]};
 $('#receipt-type-form').reset();$('#receipt-type-form').elements.templateName.value=receiptDraft.name;$('#receipt-template-error').textContent='';renderTemplateFields();$('#receipt-types-dialog').close();$('#receipt-type-editor').showModal();
}
$('#manage-receipt-types').onclick=()=>{$('#settings-dialog').close();renderReceiptTypes();$('#receipt-types-feedback').textContent='';$('#receipt-types-dialog').showModal();};
$('#new-receipt-type').onclick=()=>openReceiptType();
$('#receipt-types-list').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.editReceiptType){openReceiptType(b.dataset.editReceiptType);return;}
 if(b.dataset.deleteReceiptType){
  const id=b.dataset.deleteReceiptType;if(state.services.some(s=>s.receiptTypeId===id)){$('#receipt-types-feedback').textContent='Este tipo está asignado a un servicio. Cambiá su tipo antes de eliminarlo.';return;}
  if(!confirm('¿Eliminar esta plantilla? Los comprobantes registrados se conservan.'))return;
  const next=structuredClone(state);next.receiptTypes=next.receiptTypes.filter(t=>t.id!==id);if(save(next))renderReceiptTypes();
 }
});
$('#add-receipt-field').onclick=()=>{readTemplateFields();if(receiptDraft.fields.length>=30){$('#receipt-template-error').textContent='Podés agregar hasta 30 campos.';return;}receiptDraft.fields.push({id:crypto.randomUUID(),label:'',type:'text',required:false,options:[]});renderTemplateFields();};
$('#receipt-template-fields').addEventListener('change',e=>{if(e.target.matches('[data-field-type]')){readTemplateFields();renderTemplateFields();}});
$('#receipt-template-fields').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;readTemplateFields();
 if(b.dataset.removeReceiptField!==undefined)receiptDraft.fields.splice(Number(b.dataset.removeReceiptField),1);
 if(b.dataset.receiptMove){const from=Number(b.dataset.index),to=from+Number(b.dataset.receiptMove);if(to>=0&&to<receiptDraft.fields.length){const [field]=receiptDraft.fields.splice(from,1);receiptDraft.fields.splice(to,0,field);}}
 renderTemplateFields();
});
$('#receipt-type-form').onsubmit=e=>{
 e.preventDefault();readTemplateFields();try{const [type]=normalizeReceiptTypes([receiptDraft]),next=structuredClone(state);next.receiptTypes=next.receiptTypes||[];const index=next.receiptTypes.findIndex(t=>t.id===type.id);if(index<0)next.receiptTypes.push(type);else next.receiptTypes[index]=type;if(save(next)){$('#receipt-type-editor').close();renderReceiptTypes();$('#receipt-types-dialog').showModal();}}catch(err){$('#receipt-template-error').textContent=err.message;}
};
$('#receipt-type-editor').addEventListener('close',()=>{$('#receipt-type-form').reset();$('#receipt-template-fields').innerHTML='';receiptDraft=null;});
function openReceipt(billId,onSaved=null){
 const bill=state.bills.find(b=>b.id===billId);if(!bill)return false;
 const service=state.services.find(s=>s.id===bill.serviceId),type=(state.receiptTypes||[]).find(t=>t.id===service.receiptTypeId);
 if(!bill.receipt&&!type){notify('Asigná un tipo de comprobante a este servicio desde Editar servicio. Creá sus campos en Configuraciones → Tipos de comprobante.');return false;}
 receiptSchema=bill.receipt?{id:bill.receipt.typeId,name:bill.receipt.typeName,fields:structuredClone(bill.receipt.fields)}:structuredClone(type);receiptBillId=bill.id;receiptReturn=onSaved;
 $('#receipt-form').reset();$('#receipt-title').textContent=bill.receipt?'Editar comprobante':'Registrar comprobante';$('#receipt-error').textContent='';$('#receipt-bill-info').textContent=`${serviceLabel(service)} · ${periodLabel(bill.period)} · ${money(bill.amount)}`;$('#receipt-type-info').textContent=receiptSchema.name;$('#receipt-document-name').textContent=documentName(bill,'PAG');
 $('#receipt-value-fields').innerHTML=receiptSchema.fields.map((f,index)=>{
  const value=bill.receipt?f.value:f.type==='amount'?String(bill.amount):f.type==='date'?(bill.paidAt||today()):'';
  const attributes=`name="value${index}" ${f.required?'required':''}`;
  return `<label>${esc(f.label)}${f.required?' *':''}${f.type==='select'?`<select ${attributes}><option value="">Elegí una opción</option>${f.options.map(o=>`<option value="${esc(o)}" ${value===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input ${attributes} type="${f.type==='amount'||f.type==='number'?'number':f.type}" ${f.type==='amount'?'min="0" step="0.01"':f.type==='number'?'step="any"':f.type==='time'?'step="60"':'maxlength="1000"'} value="${esc(value)}" />`}</label>`;
 }).join('');$('#receipt-dialog').showModal();return true;
}
$('#receipt-form').onsubmit=e=>{
 e.preventDefault();try{
  const receipt=normalizeReceipt({typeId:receiptSchema.id,typeName:receiptSchema.name,fields:receiptSchema.fields.map((f,index)=>({...f,value:e.target.elements['value'+index].value.trim()})),savedAt:new Date().toISOString()}),next=structuredClone(state),bill=next.bills.find(b=>b.id===receiptBillId);
  if(!bill)throw Error('La factura ya no existe.');bill.receipt=receipt;
  if(save(next)){const callback=receiptReturn;receiptReturn=null;$('#receipt-dialog').close();notify('Comprobante guardado. El estado del pago se conserva.');if(callback)callback(true);}
 }catch(err){$('#receipt-error').textContent=err.message;}
};
$('#receipt-dialog').addEventListener('close',()=>{const callback=receiptReturn;receiptReturn=null;receiptBillId='';receiptSchema=null;$('#receipt-form').reset();$('#receipt-value-fields').innerHTML='';if(callback)callback(false);});
document.addEventListener('click',e=>{const button=e.target.closest('[data-action="receipt"]');if(button)openReceipt(button.dataset.id);});
syncReceiptTypeOptions();
