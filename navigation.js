'use strict';
(()=>{
 const header=document.querySelector('body>header'),dateNode=document.querySelector('#header-date'),timeNode=document.querySelector('#header-time');
 const dateFormat=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const timeFormat=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const tick=()=>{const now=new Date();dateNode.textContent=dateFormat.format(now).replace(',','');timeNode.textContent=timeFormat.format(now);timeNode.dateTime=now.toISOString();};
 tick();setInterval(tick,1000);
 const spacer=document.createElement('div');spacer.className='header-spacer';spacer.setAttribute('aria-hidden','true');header.after(spacer);
 const brand=header.querySelector('.brand'),settings=header.querySelector('.header-settings');
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,idleTimer=0,progress=window.scrollY>=90?1:0,target=progress,lastY=Math.max(0,window.scrollY),previousTime=0;
 const applyProgress=value=>{
  progress=value;
  header.style.setProperty('--header-progress',value.toFixed(4));
  const hidden=value>=.67;brand.inert=hidden;settings.inert=hidden;
  header.classList.toggle('is-floating-clock',hidden);
 };
 // Un único ciclo sigue el objetivo: los eventos de scroll no reinician la animación.
 const step=now=>{
  const elapsed=Math.min(50,previousTime?now-previousTime:16);previousTime=now;
  const next=progress+(target-progress)*(1-Math.exp(-elapsed/65));
  if(Math.abs(next-target)<.001){applyProgress(target);frame=0;previousTime=0;return;}
  applyProgress(next);frame=requestAnimationFrame(step);
 };
 const moveTo=value=>{
  target=Math.min(1,Math.max(0,value));
  if(reducedMotion.matches){cancelAnimationFrame(frame);frame=0;previousTime=0;applyProgress(target);return;}
  if(!frame&&Math.abs(progress-target)>=.001)frame=requestAnimationFrame(step);
 };
 const settleHeader=()=>{idleTimer=0;moveTo(target<.5?0:1);};
 const scheduleHeader=()=>{
  const y=Math.max(0,window.scrollY),delta=y-lastY;lastY=y;
  if(Math.abs(delta)<.5)return;
  clearTimeout(idleTimer);
  // Tras encajar en un extremo, continuar bajando no vuelve a abrir la cabecera.
  const next=y===0?0:y>=180?1:target+delta/180;
  moveTo(reducedMotion.matches?(y>=90?1:0):next);
  idleTimer=setTimeout(settleHeader,220);
 };
 window.addEventListener('scroll',scheduleHeader,{passive:true});applyProgress(progress);
 const measureDate=()=>header.style.setProperty('--header-date-width',dateNode.scrollWidth+'px');
 measureDate();window.addEventListener('resize',measureDate);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 const nav=document.querySelector('.floating-navigation'),toggle=document.querySelector('#floating-navigation-toggle'),panel=document.querySelector('#floating-navigation-panel');
 const setOpen=open=>{nav.classList.toggle('is-open',open);panel.inert=!open;document.querySelector('#floating-navigation-tools').inert=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar navegación rápida':'Abrir navegación rápida');};
 const toTop=()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 document.querySelector('#floating-scroll-top').addEventListener('click',()=>{toTop();setOpen(false);toggle.focus({preventScroll:true});});
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
 panel.addEventListener('click',event=>{if(!event.target.closest('button'))return;setOpen(false);toggle.focus({preventScroll:true});toTop();});
 document.addEventListener('click',event=>{if(!nav.contains(event.target))setOpen(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus({preventScroll:true});}});
})();
