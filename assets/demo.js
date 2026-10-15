// Local demonstration transport. No contact details leave the browser.
(()=>{
 const realFetch=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const url=typeof input==='string'?input:input.url;
  if(url?.includes('/mokry-nos/__demo__/request'))return Promise.resolve(new Response(JSON.stringify({success:true,demo:true,message:'Демонстрация: запрос не отправлен.'}),{status:200,headers:{'Content-Type':'application/json'}}));
  return realFetch(input,init);
 };
 const map=window.MN_I18N||{};
 const rules=window.MN_PREFIXES||[];
 const names=['Oat & aloe wash','Pin slicker brush','Rubber curry','Biothane lead','Peanut butter bones','Detangling mist','Steel greyhound comb','Microfibre drying towel','Paw balm','Waxed cotton collar','Salmon skin bites','Soft cat brush','Chicken freeze-dried bits','Bath & coat','Brushes & combs','Out & about','Treats','For cats','Curls & doodles','Double coats','Short coats'];
 const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','aria-valuetext','title','placeholder']};
 const norm=s=>s.replace(/\s+/g,' ').trim();
 function tr(s){
  const k=norm(s);
  if(map[k])return map[k];
  const rule=rules.find(([prefix])=>k.startsWith(prefix));if(rule)return rule[1];
  let out=s.replace(/\$([\d,]+(?:\.\d+)?)/g,(_,n)=>`${Number(n.replaceAll(',','')).toLocaleString('ru-RU')} ₽`)
   .replace(/Thanks, (.+)\. Here’s what happens next/,'Спасибо, $1! Что дальше')
   .replaceAll('Tubwell','Мокрый нос').replaceAll('With the pet’s groom','Вместе с питомцем')
   .replaceAll('Add another','Добавить ещё').replaceAll('In your bag','В пакете')
   .replaceAll('Remove','Убрать')
   .replace(/\bfrom(?=\s+\d)/gi,'от').replace(/\blb\b/g,'кг')
   .replace(/\(doodle\)/g,'(кудри)').replace(/doodle coat/g,'кудрявая шерсть')
   .replace(/\bfirst visit\b/g,'первый визит').replace(/\bbeen before\b/g,'уже бывал у нас')
   .replace(/prefers a text/g,'предпочитает сообщение').replace(/prefers a call/g,'предпочитает звонок').replace(/prefers email/g,'предпочитает почту')
   .replace(/\beach\b/g,'за штуку').replace(/^Quantity of /,'Количество: ').replace(/(\d+) items?\b/g,'$1 шт.').replace(/\bTomorrow\b/g,'Завтра')
   .replace(/\bis\s*$/,'').replace(/ on (?=[А-ЯЁ])/g,' · ').replace(/ at (?=\d)/g,' в ')
   .replace(/, (\d+) drop-off times? free/g,', свободных окон: $1')
   .replace(/, closed/g,', закрыто').replace(/, fully booked/g,', всё занято').replace(/, full/g,', занято')
   .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g,d=>({Mon:'пн',Tue:'вт',Wed:'ср',Thu:'чт',Fri:'пт',Sat:'сб',Sun:'вс'})[d])
   .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g,d=>({Jan:'янв',Feb:'фев',Mar:'мар',Apr:'апр',May:'май',Jun:'июн',Jul:'июл',Aug:'авг',Sep:'сен',Oct:'окт',Nov:'ноя',Dec:'дек'})[d]);
  for(const name of names)out=out.replaceAll(name,map[name]||name);
  return out;
 }
 let scheduled=false;
 function localize(){
  scheduled=false;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const changes=[];
  while(w.nextNode()){
   const n=w.currentNode;if(n.parentElement?.closest('script,style,svg,textarea'))continue;
   const v=tr(n.textContent);if(v!==n.textContent)changes.push([n,v]);
  }
  observer.disconnect();for(const[n,v]of changes)n.textContent=v;
  for(const el of document.querySelectorAll('[aria-label],[aria-valuetext],[title],[placeholder]'))for(const name of ['aria-label','aria-valuetext','title','placeholder']){
   const value=el.getAttribute(name);if(value){const ru=tr(value);if(ru!==value)el.setAttribute(name,ru);}
  }
  for(const el of document.querySelectorAll('[data-open-text]')){
   // Recompute the studio sign in Moscow time with a 24-hour clock.
   const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Moscow'}));
   const day=d.getDay(),hour=d.getHours();
   const open=day>=2&&day<=6&&hour>=9&&hour<19;
   el.textContent=open?'Открыто · сегодня до 19:00':'Сейчас закрыто · вт — сб, 9:00–19:00';
  }
  for(const el of document.querySelectorAll('[data-tub-text]')){
   const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Moscow'}));
   const day=d.getDay(),h=d.getHours(),closing=day===0||day===6?19:20;
   el.textContent=day!==1&&h>=10&&h<closing?`Самомойка открыта до ${closing}:00`:'Самомойка · вт — вс, с 10:00';
  }
  for(const el of document.querySelectorAll('[data-bag-link]'))el.setAttribute('aria-label','Открыть пакет покупок');
  observer.observe(document.body,options);
 }
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(localize)}});
 document.addEventListener('DOMContentLoaded',()=>{
  for(const el of document.querySelectorAll('[data-demo-note]'))el.textContent='Демонстрация: запрос не отправлен. Студия вымышленная, данные никуда не передаются.';
  localize();
 });
})();
