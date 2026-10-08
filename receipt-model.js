'use strict';
const RECEIPT_FIELD_TYPES={text:'Texto',number:'Número',date:'Fecha',time:'Hora (HH:MM)',amount:'Importe',select:'Lista de opciones'};
function receiptFields(data){
 if(!Array.isArray(data)||!data.length||data.length>30)throw Error('Elegí entre 1 y 30 campos para el comprobante.');
 const ids=new Set();return data.map(f=>{
  if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.label!=='string'||!f.label.trim()||f.label.length>80||!Object.hasOwn(RECEIPT_FIELD_TYPES,f.type))throw Error('Campo de comprobante inválido.');
  ids.add(f.id);const options=f.type==='select'?[...new Set((Array.isArray(f.options)?f.options:[]).map(x=>typeof x==='string'?x.trim():'').filter(Boolean))]:[];
  if(f.type==='select'&&(!options.length||options.length>50||options.some(x=>x.length>100)))throw Error('Cada lista debe tener entre 1 y 50 opciones de hasta 100 caracteres.');
  return {id:f.id,label:f.label.trim(),type:f.type,required:f.required===true,options};
 });
}
function normalizeReceiptTypes(data){
 if(data===undefined)return [];
 if(!Array.isArray(data)||data.length>100)throw Error('Tipos de comprobante inválidos.');
 const ids=new Set();return data.map(t=>{
  if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>80)throw Error('Tipo de comprobante inválido.');
  ids.add(t.id);return {id:t.id,name:t.name.trim(),fields:receiptFields(t.fields)};
 });
}
function normalizeReceipt(data){
 if(data==null)return null;
 if(typeof data.typeId!=='string'||!data.typeId||typeof data.typeName!=='string'||!data.typeName.trim()||data.typeName.length>80||typeof data.savedAt!=='string'||isNaN(Date.parse(data.savedAt)))throw Error('Comprobante inválido.');
 const fields=receiptFields(data.fields).map((f,index)=>{
  const value=data.fields[index].value;if(typeof value!=='string'||value.length>1000||(f.required&&!value.trim()))throw Error(`Revisá el campo ${f.label}.`);
  if(value&&f.type==='date'&&!validDate(value))throw Error(`Fecha inválida en ${f.label}.`);
  if(value&&f.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error(`Hora inválida en ${f.label}. Usá HH:MM.`);
  if(value&&['number','amount'].includes(f.type)&&(!Number.isFinite(Number(value))||(f.type==='amount'&&Number(value)<0)))throw Error(`Número inválido en ${f.label}.`);
  if(value&&f.type==='select'&&!f.options.includes(value))throw Error(`Opción inválida en ${f.label}.`);
  return {...f,value};
 });
 return {typeId:data.typeId,typeName:data.typeName.trim(),fields,savedAt:data.savedAt};
}
function receiptSummaryHTML(b){
 if(!b.receipt)return '';
 return `<details class="receipt-summary"><summary>Comprobante registrado · ${esc(b.receipt.typeName)}</summary><dl>${b.receipt.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value?f.type==='amount'?money(Number(f.value)):f.type==='date'?date(f.value):f.value:'Sin completar')}</dd></div>`).join('')}</dl><p class="meta">${esc(documentName(b,'PAG'))}</p></details>`;
}
