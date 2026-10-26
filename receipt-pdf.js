'use strict';
function constanciaSections(bill,service,generatedAt,variant='extended'){
 if(!bill.paidAt)throw Error('Primero confirmá el pago de esta factura.');
 if(!bill.receipt)throw Error('Primero registrá los datos del comprobante.');
 if(!['extended','summary'].includes(variant))throw Error('Elegí una versión válida de la constancia.');
 if(variant==='summary'){
  const rows=bill.receipt.fields.filter(f=>f.value.trim()!=='').map(f=>[f.label,f.type==='amount'?money(Number(f.value)):f.type==='date'?date(f.value):f.value]);
  if(!rows.length)throw Error('Completá al menos un campo del comprobante para generar la versión resumida.');
  return [{title:'Servicio y factura',rows:[['Servicio',service.name||'Sin registrar'],['Empresa prestadora',service.entity||'Sin registrar'],['Factura del proveedor',bill.providerInvoiceCode||'Sin registrar']]},{title:'Datos del comprobante',rows}];
 }

 const value=v=>v==null||v===''?'Sin registrar':String(v);
 const timestamp=moment=>new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(moment);
 return [
  {title:'Servicio y documentos',rows:[['Servicio',service.name],['Proveedor',value(service.entity)],['Número de servicio',value(service.serviceNumber)],['Página oficial',value(service.officialUrl)],['Código compartido',bill.documentCode],['Referencia bancaria',bill.bankReference],['Archivo de factura',documentName(bill,'FAC')],['Archivo de constancia',documentName(bill,'PAG','pdf')]]},
  {title:'Factura',rows:[['Número o código del proveedor',value(bill.providerInvoiceCode)],['Período',periodLabel(bill.period)],['Importe facturado (ARS)',money(bill.amount)],['Vencimiento',date(bill.due)],['Próximo vencimiento anunciado',bill.nextDue?date(bill.nextDue):'Sin registrar'],['Consumo',bill.consumption!=null?`${bill.consumption}${service.unit?' '+service.unit:''}`:'Sin registrar'],['Estado del pago','Confirmado por el usuario'],['Fecha de pago confirmada',date(bill.paidAt)],['Notas personales',value(bill.note)]]},
  {title:'Comprobante registrado',rows:[['Tipo de comprobante',bill.receipt.typeName],...bill.receipt.fields.map(f=>[f.label,f.value?f.type==='amount'?money(Number(f.value)):f.type==='date'?date(f.value):f.value:'Sin completar']),['Datos registrados el',timestamp(new Date(bill.receipt.savedAt))]]},
  {title:'Generación de esta constancia',rows:[['Generada el',timestamp(generatedAt)],['Zona horaria','Argentina (Buenos Aires)'],['Origen de los datos','Registros locales de Casa al día, ingresados por el usuario.']]}
 ];
}
function facturaSections(bill,service,generatedAt){
 const value=v=>v==null||v===''?'Sin registrar':String(v);
 return [
  {title:'Servicio y documento',rows:[['Servicio',service.name],['Proveedor',value(service.entity)],['Número de servicio',value(service.serviceNumber)],['Página oficial',value(service.officialUrl)],['Código compartido',bill.documentCode],['Referencia bancaria',bill.bankReference],['Archivo de factura',documentName(bill,'FAC')]]},
  {title:'Factura registrada',rows:[['Número o código del proveedor',value(bill.providerInvoiceCode)],['Período',periodLabel(bill.period)],['Importe facturado (ARS)',money(bill.amount)],['Vencimiento',date(bill.due)],['Próximo vencimiento anunciado',bill.nextDue?date(bill.nextDue):'Sin registrar'],['Consumo',bill.consumption!=null?String(bill.consumption)+(service.unit?' '+service.unit:''):'Sin registrar'],['Estado',status(bill)[1]],['Fecha de pago',bill.paidAt?date(bill.paidAt):'Sin pago confirmado'],['Notas personales',value(bill.note)]]},
  {title:'Generación de este documento',rows:[['Generado el',new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'medium',hourCycle:'h23'}).format(generatedAt)],['Zona horaria','Argentina (Buenos Aires)'],['Origen de los datos','Registros locales de Casa al día, ingresados por el usuario.']]}
 ];
}
async function createFacturaPDF(bill,service,generatedAt=new Date(),canvasFactory=()=>document.createElement('canvas')){
 return createConstanciaPDF(bill,service,generatedAt,canvasFactory,'FAC');
}
async function createConstanciaPDF(bill,service,generatedAt=new Date(),canvasFactory=()=>document.createElement('canvas'),documentType='PAG',variant='extended'){
 const invoice=documentType==='FAC',summary=!invoice&&variant==='summary',sections=invoice?facturaSections(bill,service,generatedAt):constanciaSections(bill,service,generatedAt,variant);
 const {PDFDocument,StandardFonts,rgb}=PDFLib;
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setTitle(invoice?'Factura · Registro personal':summary?'Constancia de pago':'Constancia personal de pago');pdf.setAuthor('Casa al día');pdf.setSubject(summary?'Constancia de pago':documentName(bill,documentType,'pdf'));pdf.setCreationDate(generatedAt);
 const blue=rgb(.09,.25,.65),ink=rgb(.09,.13,.23),muted=rgb(.35,.40,.48),pages=[];
 let page,y=0;
 const unicodeCanvas=canvasFactory(),unicodeContext=unicodeCanvas.getContext('2d');
 function width(text,font,size){try{return font.widthOfTextAtSize(text,size);}catch{unicodeContext.font=`${font===bold?'bold ':''}${size*2}px sans-serif`;return unicodeContext.measureText(text).width/2;}}
 function wrap(text,font,size,maxWidth){
  const output=[];
  for(const paragraph of String(text).replace(/\r/g,'').split('\n')){
   let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){
    const joined=line?line+' '+word:word;
    if(width(joined,font,size)<=maxWidth){line=joined;continue;}
    if(line){output.push(line);line='';}
    if(width(word,font,size)<=maxWidth){line=word;continue;}
    for(const character of word){if(line&&width(line+character,font,size)>maxWidth){output.push(line);line='';}line+=character;}
   }
   output.push(line);
  }
  return output.length?output:[''];
 }
 async function text(line,x,baseline,font,size,color){
  if(!line)return;
  try{font.encodeText(line);page.drawText(line,{x,y:baseline,font,size,color});}
  catch{
   // Preserve Unicode values unsupported by the standard PDF fonts as a sharp local image.
   const canvas=canvasFactory(),measure=width(line,font,size),height=size*1.5;
   canvas.width=Math.ceil(measure*3+6);canvas.height=Math.ceil(height*3);
   const ctx=canvas.getContext('2d');ctx.font=`${font===bold?'bold ':''}${size*3}px sans-serif`;ctx.fillStyle=`rgb(${Math.round(color.red*255)},${Math.round(color.green*255)},${Math.round(color.blue*255)})`;ctx.textBaseline='alphabetic';ctx.fillText(line,0,size*3);
   const image=await pdf.embedPng(canvas.toDataURL('image/png'));page.drawImage(image,{x,y:baseline-(height-size),width:canvas.width/3,height:canvas.height/3});
  }
 }
 async function newPage(){
  page=pdf.addPage([595.28,841.89]);pages.push(page);
  await text(invoice?'FACTURA · REGISTRO PERSONAL':summary?'CONSTANCIA DE PAGO':'CONSTANCIA PERSONAL DE PAGO',44,791,bold,18,blue);
  if(!summary){
   await text('No emitida por el proveedor. Elaborada a partir de tus registros.',44,770,regular,10,muted);
   await text(`${bill.documentCode}  |  ${bill.bankReference}`,44,750,regular,10,muted);
  }
  const dividerY=summary?775:739;
  page.drawLine({start:{x:44,y:dividerY},end:{x:551,y:dividerY},thickness:1,color:blue});y=dividerY-25;
 }
 await newPage();
 for(const section of sections){
  if(y<180)await newPage();
  await text(section.title,44,y,bold,13,blue);y-=26;
  for(const [label,value] of section.rows){
   const labels=wrap(label,regular,10,145),values=wrap(value,regular,11,343),count=Math.max(labels.length,values.length);
   if(y-Math.min(count,4)*16<65){await newPage();await text(section.title+' (continuación)',44,y,bold,13,blue);y-=26;}
   for(let i=0;i<count;i++){
    if(y<65){await newPage();await text(section.title+' (continuación)',44,y,bold,13,blue);y-=26;}
    await text(labels[i]||'',44,y,regular,10,muted);await text(values[i]||'',208,y,regular,11,ink);y-=16;
   }
   y-=9;
  }
  y-=15;
 }
 for(let index=0;index<pages.length;index++){
  page=pages[index];page.drawLine({start:{x:44,y:43},end:{x:551,y:43},thickness:.5,color:muted});
  await text(invoice?'Casa al día · Registro personal de factura':summary?'Casa al día · Constancia de pago':'Casa al día · Constancia personal',44,27,regular,9,muted);
  await text(`Página ${index+1} de ${pages.length}`,463,27,regular,9,muted);
 }
 return pdf.save();
}
function chooseConstanciaVariant(){
 const dialog=document.querySelector('#constancia-version-dialog');
 if(dialog.open)return Promise.resolve(null);
 dialog.returnValue='';
 return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(['extended','summary'].includes(dialog.returnValue)?dialog.returnValue:null),{once:true});dialog.showModal();});
}
async function downloadConstancia(id,variant=null){
 const context=feedbackContext;
 const bill=state.bills.find(b=>b.id===id);if(!bill)throw Error('No se encontró la factura.');
 const service=state.services.find(s=>s.id===bill.serviceId);if(!service)throw Error('No se encontró el servicio.');
 if(!bill.paidAt)throw Error('Primero confirmá el pago de esta factura.');
 if(!bill.receipt)throw Error('Primero registrá los datos del comprobante.');
 variant=variant||await chooseConstanciaVariant();if(!variant)return false;
 const bytes=await createConstanciaPDF(structuredClone(bill),structuredClone(service),new Date(),()=>document.createElement('canvas'),'PAG',variant),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=documentName(bill,'PAG','pdf');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 notify(`Constancia ${variant==='summary'?'resumida':'extendida'} PDF generada. Revisá la carpeta de descargas.`,context,'success');return true;
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action="receipt-pdf"], [data-action="invoice-pdf"]');if(!button||button.disabled)return;
 const context=feedbackScope(button);button.disabled=true;try{if(button.dataset.action==='invoice-pdf')await downloadFacturaPDF(button.dataset.id);else await downloadConstancia(button.dataset.id);}catch(error){notify(error.message||'No se pudo generar el PDF.',context);}finally{button.disabled=false;}
});

async function downloadFacturaPDF(id){
 const context=feedbackContext;
 const bill=state.bills.find(b=>b.id===id);if(!bill)throw Error('No se encontró la factura.');
 const service=state.services.find(s=>s.id===bill.serviceId);if(!service)throw Error('No se encontró el servicio.');
 const bytes=await createFacturaPDF(structuredClone(bill),structuredClone(service)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=documentName(bill,'FAC');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 notify('Factura PDF personal generada. Revisá la carpeta de descargas.',context,'success');return true;
}

