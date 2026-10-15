import fs from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';

const origin='https://tubwell.visuvate.com';
const manifest=JSON.parse(await fs.readFile('.reference/manifest.json','utf8'));
const imagePlan=JSON.parse(await fs.readFile('src/image-plan.json','utf8'));
const imageKey=raw=>(raw||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').replace(/-\d{2,4}(?:x\d{2,4})?$/,'');
const pairs=(await fs.readFile('src/ru.tsv','utf8')).split('\n').filter(x=>x.includes('\t')).map(x=>x.split('\t'));
const dictionary=Object.fromEntries(pairs);
const prefixes=(await fs.readFile('src/ru-prefix.tsv','utf8')).split('\n').filter(x=>x.includes('\t')).map(x=>x.split('\t')).sort((a,b)=>b[0].length-a[0].length);
const unknown=new Set();
const norm=s=>s.replace(/\s+/g,' ').trim();
const servicePrices={85:3900,105:4900,130:5900,160:6900,60:2400,75:3200,95:4200,115:5200,70:3200,90:3900,55:1800,110:3500,18:600,24:800};
const price=(n,service=false)=>service&&servicePrices[Number(n)]?servicePrices[Number(n)]:Math.round(Number(n))*50;
const money=n=>`${Math.round(n).toLocaleString('ru-RU')} ₽`;
const replaceBrand=s=>s.replaceAll('Tubwell','Мокрый нос').replaceAll('Sellwood, Portland','Москва').replaceAll('Sellwood','Москва').replaceAll('Portland, OR 97202','Москва · демоадрес').replaceAll('8014 SE 13th Ave','ул. Лапкина, 12').replaceAll('(503) 555-0148','Демостудия').replaceAll('hello@tubwellgrooming.com','hello@mokrynos.example');
function translate(s,{prices=false,service=false}={}){
 const key=norm(s);
 if(!key)return s;
 let out=dictionary[key]??dictionary[replaceBrand(key)];
 if(out===undefined){const prefix=prefixes.find(([p])=>key.startsWith(p)||replaceBrand(key).startsWith(p));if(prefix)out=prefix[1];}
 if(out===undefined){
  out=replaceBrand(s);
  if(out===s&&/[A-Za-z]{3}/.test(key)&&!/^https?:|^\//.test(key))unknown.add(key);
 }
 if(/^Add to bag\b/.test(out))out=out.replace(/^Add to bag/,'В пакет');
 if(/^Add |^В пакет:/.test(out)){
  out=out.replace(/^Add /,'Добавить ').replace(/, to pickup bag$/,' — в пакет');
  for(const name of ['Oat & aloe wash','Pin slicker brush','Rubber curry','Biothane lead','Peanut butter bones','Detangling mist','Steel greyhound comb','Microfibre drying towel','Paw balm','Waxed cotton collar','Salmon skin bites','Soft cat brush','Chicken freeze-dried bits'])out=out.replace(name,dictionary[name]||name);
 }
 if(prices)out=out.replace(/\bfrom (?=\$|\d)/gi,'от ').replace(/\$([\d,]+(?:\.\d+)?)/g,(_,n)=>money(price(n.replaceAll(',',''),service)));
 if(dictionary[key]!==undefined||dictionary[replaceBrand(key)]!==undefined){out=(s.match(/^\s*/)?.[0]||'')+out+(s.match(/\s*$/)?.[0]||'');}
 return out;
}
function localURL(raw){
 if(!raw)return raw;
 if(!raw.startsWith(origin))return raw;
 try{const u=new URL(raw,origin);return u.origin===origin?u.pathname+u.search+u.hash:raw;}catch{return raw;}
}
function localizeObject(v){
 if(typeof v==='string')return translate(localURL(v));
 if(Array.isArray(v))return v.map(localizeObject);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,localizeObject(x)]));
 return v;
}
await fs.mkdir('site',{recursive:true});
await fs.mkdir('public/assets',{recursive:true});
await fs.cp('.reference/wp-content','public/wp-content',{recursive:true});
const replacement={'peek3-cavapoo.webp':'cavapoo','peek3-yorkie.webp':'yorkie','peek3-cat.webp':'cat','peek3-beagle.webp':'beagle'};
for(const route of manifest.routes){
 const {document}=parseHTML(await fs.readFile(path.join('.reference/pages',route,'index.html'),'utf8'));
 document.documentElement.lang='ru';
 const title=document.title.split(' | ')[0].split(' – ')[0];
 const ruTitle=dictionary[title]??pairs.find(([k])=>k.toLowerCase()===title.toLowerCase())?.[1]??translate(title);
 document.title=`${route==='/'?'Бережный груминг в Москве':ruTitle} — Мокрый нос`;
 for(const e of document.querySelectorAll('.vv-badge,link[rel="canonical"],link[rel="alternate"],link[rel="https://api.w.org/"],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]'))e.remove();
 const desc=document.querySelector('meta[name="description"]');if(desc)desc.setAttribute('content','Мокрый нос — демонстрационный сайт студии груминга в Москве. Бережный уход за собаками и кошками.');
 for(const a of document.querySelectorAll('a[href]')){
  const href=a.getAttribute('href');
  if(href.startsWith('tel:')){a.setAttribute('href','/studio/#contact');a.textContent='Москва';}
  else if(href.includes('tubwellgrooming.com'))a.setAttribute('href','mailto:hello@mokrynos.example');
  else if(/google\.|maps\.|instagram\.com|visuvate\.com(?!\/wp-content)/.test(href)&&!href.startsWith(origin))a.setAttribute('href','/studio/#contact');
  else a.setAttribute('href',localURL(href));
 }
 for(const el of document.querySelectorAll('*')){
  for(const attr of [...el.attributes]){
   if(['src','href','action','poster'].includes(attr.name))el.setAttribute(attr.name,localURL(attr.value));
   if(attr.name==='srcset')el.setAttribute('srcset',attr.value.replaceAll(origin,''));
   if(['alt','aria-label','title','placeholder','data-for-tpl','data-name','data-added','data-again','data-sticker','data-prefix','data-word','data-valuetext','data-required','data-how-text','data-how-call','data-how-email','data-min-msg','data-done','data-status','data-toast','data-hand-done','data-toast-n','data-add'].includes(attr.name))el.setAttribute(attr.name,translate(attr.value,{prices:true,service:!route.startsWith('/shop')}));
   if(attr.name.startsWith('data-')&&/^[{[]/.test(attr.value.trim())){
    try{
     let obj=JSON.parse(attr.value);
     if(attr.name==='data-price')obj=Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,price(v,true)]));
     else {
      obj=localizeObject(obj);
      if(attr.name==='data-services')obj=obj.map(s=>({...s,price:typeof s.price==='number'?price(s.price,true):Object.fromEntries(Object.entries(s.price).map(([k,v])=>[k,price(v,true)]))}));
      if(attr.name==='data-cfg'&&el.hasAttribute('data-book')){
       obj.sizes=obj.sizes.map((s,i)=>({...s,max:[9,20,36,250][i]}));
       obj.addons=obj.addons.map(a=>({...a,price:price(a.price),max:a.max?price(a.max):0}));
       obj.prices={clip:600,grind:800,bath:3500,lion:4500,doodle:1000};
       obj.drop=['9:00','9:30','10:00','10:30','11:00'];
       obj.nail=['13:00','13:30','14:00','14:30','15:00','15:30'];
      }
     }
     el.setAttribute(attr.name,JSON.stringify(obj));
    }catch{}
   }
  }
 }
 function walk(n){
  if(n.nodeType===3){
   if(norm(n.textContent)==='8 oz'){n.textContent=route==='/shop/detangler/'?'200 мл':'200 г';return;}
   n.textContent=translate(n.textContent,{prices:true,service:!route.startsWith('/shop')&&!n.parentElement?.closest('.prod,.prod-stage,.shelf,[data-bag]')});return;
  }
  if(['SCRIPT','STYLE','SVG'].includes(n.tagName))return;
  for(const c of [...n.childNodes])walk(c);
 }
 walk(document.body);
 document.title=route==='/'?'Бережный груминг в Москве — Мокрый нос':`${norm(document.querySelector('h1')?.textContent||'Мокрый нос')} — Мокрый нос`;
 document.querySelector('[data-mobile-menu] nav')?.setAttribute('aria-label','Мобильная навигация');
 for(const o of document.querySelectorAll('datalist option[value]'))o.setAttribute('value',translate(o.getAttribute('value')));
 for(const input of document.querySelectorAll('input[type="tel"]'))input.setAttribute('placeholder','+7 999 123-45-67');
 for(const text of document.querySelectorAll('svg text')){
  const label=norm(text.textContent);
  if(dictionary[label]!==undefined)text.textContent=dictionary[label];
  if(label==='8000')text.textContent='12';
 }
 for(const text of document.querySelectorAll('svg text,svg tspan,textPath')){
  if(text.children.length===0)text.textContent=translate(text.textContent);
 }
 for(const h of document.querySelectorAll('h1,h2,h3,h4')){
  if(norm(h.textContent)==='Стрижка и стрижка')h.textContent='Стрижка';
 }
 for(const img of document.querySelectorAll('img')){
  const file=img.getAttribute('src')?.split('/').pop();
  const spec=imagePlan.jobs.find(j=>j.key===imageKey(img.getAttribute('src')));
  if(spec&&img.getAttribute('alt'))img.setAttribute('alt',spec.alt);
  if(replacement[file]){
   img.setAttribute('src',`/images/${replacement[file]}-peek.webp`);img.removeAttribute('srcset');
  }
  if(file==='chip-muddy.webp'||file==='chip-fluffy.webp'){
   img.setAttribute('src',`/images/${file}`);img.removeAttribute('srcset');
  }
 }
 for(const f of document.querySelectorAll('form')){f.setAttribute('action','#');f.setAttribute('data-demo-form','');}
 for(const s of document.querySelectorAll('script:not([src])')){
  if(s.textContent.includes('window.TW_DATA=')){
   const match=s.textContent.match(/window\.TW_DATA=(\{[\s\S]*?\});/);
   const data=localizeObject(JSON.parse(match[1]));
   data.rest='/__demo__/request';data.nonce='local-demo';data.demo=true;data.home='/';data.phone='демонстрация';
   data.hours={tz:'Europe/Moscow',groom:[null,null,[9,19],[9,19],[9,19],[9,19],[9,19]],wash:[[10,19],null,[10,20],[10,20],[10,20],[10,20],[10,19]],t:{groomOpen:'Открыто · груминг до {close}',washOpen:'Самомойка открыта до {close}',closed:'Сейчас закрыто · открываемся {day} в {open}',tubOpen:'Самомойка открыта до {close}',tubClosed:'Самомойка сейчас закрыта'}};
   if(data.bag){for(const item of data.bag.catalog)item.price=price(item.price);data.bag.cfg.demo=true;}
   s.textContent=`window.MN_I18N=${JSON.stringify(dictionary)};window.MN_PREFIXES=${JSON.stringify(prefixes)};window.TW_DATA=${JSON.stringify(data)};`;
   const demo=document.createElement('script');demo.setAttribute('src','/assets/demo.js');s.after(demo);
  }else if(!s.textContent.includes("classList.remove('no-js')")&&!s.textContent.includes('tw-seen'))s.remove();
 }
 for(const s of document.querySelectorAll('script[src]'))if(!s.getAttribute('src').includes('/themes/tubwell/assets/js/')&&!s.getAttribute('src').includes('/assets/demo.js'))s.remove();
 const css=document.createElement('link');css.setAttribute('rel','stylesheet');css.setAttribute('href','/assets/brand.css');document.head.append(css);
 await fs.mkdir(path.join('site',route),{recursive:true});
 await fs.writeFile(path.join('site',route,'index.html'),'<!doctype html>\n'+document.documentElement.outerHTML);
}
// The reference theme is the layout and motion baseline. Adapt only data and
// demo transport; do not replace observed motion with generic entrances.
const runtime='public/wp-content/themes/tubwell/assets/js';
const files=[path.join(runtime,'tubwell.min.js'),...(await fs.readdir(path.join(runtime,'pages'))).filter(x=>x.endsWith('.js')).map(x=>path.join(runtime,'pages',x))];
for(const file of files){
 let s=await fs.readFile(file,'utf8');
 s=s.replaceAll('America/Los_Angeles','Europe/Moscow').replaceAll('tubwell-bag','mokry-nos-demo-bag').replaceAll('tubwell-booking','mokry-nos-demo-booking');
 // UI strings are also translated after DOM updates by demo.js.
 s=s.replace('U=t=>`$${t%1?t.toFixed(2):t}`','U=t=>`${Math.round(t).toLocaleString("ru-RU")} ₽`');
 s=s.replaceAll('`$${m[u]}`','`${Math.round(m[u]).toLocaleString("ru-RU")} ₽`');
 s=s.replace('z=n=>`$${n}`','z=n=>`${Math.round(n).toLocaleString("ru-RU")} ₽`');
 s=s.replace('Ie=e=>/poo|doodle/i.test(e)','Ie=e=>/poo|doodle|пудел|дудл|кавапу|мальтипу|кокапу/i.test(e)');
 s=s.replace('a.length===10||a.length===11&&a[0]==="1"','a.length===10||a.length===11&&/^[78]/.test(a)');
 s=s.replaceAll(' lb',' кг').replaceAll(' (doodle)',' (кудри)').replaceAll('first visit','первый визит').replaceAll('doodle coat','кудрявая шерсть');
 s=s.replaceAll('prefers a text','предпочитает сообщение').replaceAll('prefers a call','предпочитает звонок').replaceAll('prefers email','предпочитает почту');
 s=s.replaceAll('${t.petName} is','${t.petName}');
 s=s.replaceAll('toLocaleDateString("en-US"','toLocaleDateString("ru-RU"');
 s=s.replace('["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]','["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"]');
 s=s.replace('["January","February","March","April","May","June","July","August","September","October","November","December"]','["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"]');
 await fs.writeFile(file,s);
}
await fs.copyFile('src/demo.js','public/assets/demo.js');
await fs.copyFile('src/brand.css','public/assets/brand.css');
try{await fs.copyFile('docs/reference/evidence/prototype-desktop.jpg','public/wp-content/themes/tubwell/assets/share.jpg');}catch{}
await fs.writeFile('site/manifest.json',JSON.stringify({routes:manifest.routes},null,2));
await fs.writeFile('.reference/untranslated.json',JSON.stringify([...unknown].sort(),null,2));
await import('./prepare-all-images.mjs');
console.log(`Adapted ${manifest.routes.length} routes. Translation review: ${unknown.size} strings.`);
