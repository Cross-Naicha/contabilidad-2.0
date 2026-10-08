'use strict';
// Cifrado independiente de la interfaz: la clave nunca se almacena.
const CardCrypto = (() => {
 const iterations=600000,encoder=new TextEncoder(),decoder=new TextDecoder();
 const encode=bytes=>btoa(Array.from(new Uint8Array(bytes),b=>String.fromCharCode(b)).join(''));
 const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 function envelope(value){if(!value||value.version!==1||value.iterations!==iterations||typeof value.salt!=='string'||typeof value.iv!=='string'||typeof value.data!=='string'||value.data.length>1000000)throw Error('Respaldo cifrado inválido.');if(decode(value.salt).length!==16||decode(value.iv).length!==12||decode(value.data).length<16)throw Error('Respaldo cifrado inválido.');return {version:1,iterations,salt:value.salt,iv:value.iv,data:value.data};}
 async function derive(password,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 async function encrypt(cards,key,salt){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(cards)));return {version:1,iterations,salt:encode(salt),iv:encode(iv),data:encode(bytes)};}
 async function unlock(value,password){const stored=envelope(value),salt=decode(stored.salt),key=await derive(password,salt);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(stored.iv)},key,decode(stored.data));return {key,salt,cards:JSON.parse(decoder.decode(plain))};}
 async function create(password){const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt);return {key,salt,stored:await encrypt([],key,salt)};}
 return Object.freeze({envelope,encrypt,unlock,create});
})();
