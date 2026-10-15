import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';

test('all 20 agreed pages have a local Russian document and no external runtime dependencies', async()=>{
 const manifest=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
 assert.equal(manifest.routes.length,20);
 for(const route of manifest.routes){
  const html=await fs.readFile(`dist${route}index.html`,'utf8');
  const {document}=parseHTML(html);
  assert.equal(document.documentElement.lang,'ru',route);
  assert.match(document.title,/Мокрый нос/,route);
  assert.doesNotMatch(document.title,/[A-Za-z]{3}/,route+': English document title');
  assert.ok(document.querySelector('h1'),route);
  for(const el of document.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')){
   const src=el.getAttribute('src')||el.getAttribute('href');
   assert.ok(src.startsWith('/')||src.startsWith('data:'),`${route}: remote resource ${src}`);
  }
  assert.ok(!html.includes('https://tubwell.visuvate.com/wp-json'),route);
 }
});

test('all local page and asset links resolve in a clean build',async()=>{
 const manifest=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
 for(const route of manifest.routes){
  const {document}=parseHTML(await fs.readFile(`dist${route}index.html`,'utf8'));
  for(const el of document.querySelectorAll('[src],a[href],link[href]')){
   const href=el.getAttribute('src')||el.getAttribute('href');
   if(!href?.startsWith('/')||href.startsWith('//'))continue;
   let file=href.split(/[?#]/)[0];
   if(file.endsWith('/'))file+='index.html';
   await assert.doesNotReject(fs.access(`dist${decodeURI(file)}`),`${route}: missing ${file}`);
  }
 }
});

test('demo interactions never transmit contact details to the reference',async()=>{
 const runtime=await fs.readFile('src/demo.js','utf8');
 assert.match(runtime,/Демонстрация/);
 assert.match(runtime,/не отправлен/);
 assert.doesNotMatch(runtime,/fetch\s*\([^)]*tubwell/);
 const {document}=parseHTML(await fs.readFile('dist/book/index.html','utf8'));
 for(const f of document.querySelectorAll('form'))assert.ok(!/^https?:/.test(f.getAttribute('action')||''));
});

test('every page is Russian, including hidden panels and inline map labels',async()=>{
 const {routes}=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
 const leaks=[];
 for(const route of routes){
  const {document}=parseHTML(await fs.readFile(path.join('dist',route,'index.html'),'utf8'));
  function walk(n){
   if(['SCRIPT','STYLE'].includes(n.tagName))return;
   if(n.nodeType===3){const s=n.textContent.trim().replace(/[\w.+-]+@[\w.-]+/g,'').replace(/\b(?:S|M|L|XL|Enter|Escape)\b/g,'');if(/[A-Za-z]/.test(s))leaks.push(`${route}: ${s.slice(0,100)}`);}
   for(const c of n.childNodes||[])walk(c);
  }
  walk(document.body);
 }
 assert.equal(leaks.length,0,leaks.slice(0,25).join('\n'));
});

test('every displayed reference photo is replaced, including responsive variants',async()=>{
 const {routes}=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
 const replaced=new Set(JSON.parse(await fs.readFile('docs/reference/image-replacements.json','utf8')).map(x=>x.file));
 const missing=new Set();
 for(const route of routes){
  const {document}=parseHTML(await fs.readFile(path.join('dist',route,'index.html'),'utf8'));
  for(const img of document.querySelectorAll('img')){
   const urls=[img.getAttribute('src'),...(img.getAttribute('srcset')||'').split(',').map(x=>x.trim().split(/\s/)[0])];
   for(const url of urls){if(url?.startsWith('/wp-content/uploads/')&&!replaced.has(url.split('/').pop()))missing.add(url);}
  }
 }
 assert.deepEqual([...missing],[],'Unreplaced photos remain: '+[...missing].join(', '));
});

test('booking uses kilograms and the same ruble prices as the home selector',async()=>{
 const home=parseHTML(await fs.readFile('dist/index.html','utf8')).document;
 const book=parseHTML(await fs.readFile('dist/book/index.html','utf8')).document.querySelector('[data-book]');
 const cfg=JSON.parse(book.getAttribute('data-cfg'));
 const services=JSON.parse(book.getAttribute('data-services'));
 assert.deepEqual(cfg.sizes.map(s=>s.max),[9,20,36,250]);
 const prices=[...home.querySelectorAll('[data-price]')].slice(0,3).map(e=>JSON.parse(e.getAttribute('data-price')));
 for(let i=0;i<3;i++)assert.deepEqual(services[i].price,prices[i]);
 assert.equal(cfg.prices.bath,3500);assert.equal(cfg.prices.clip,600);
 assert.equal(cfg.drop[0],'9:00');
});

test('accessible descriptions and field hints are localized across all routes',async()=>{
 const {routes}=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
 const leaks=[];
 for(const route of routes){
  const {document}=parseHTML(await fs.readFile(path.join('dist',route,'index.html'),'utf8'));
  for(const el of document.querySelectorAll('[aria-label],[alt],[placeholder],[data-required],[data-min-msg]'))for(const attr of ['aria-label','alt','placeholder','data-required','data-min-msg']){
   const value=(el.getAttribute(attr)||'').replace(/[\w.+-]+@[\w.-]+/g,'').replace(/\b(?:S|M|L|XL|Enter|Escape)\b/g,'');
   if(/[A-Za-z]/.test(value))leaks.push(`${route}: ${attr} ${value.slice(0,100)}`);
  }
 }
 assert.equal(leaks.length,0,leaks.slice(0,20).join('\n'));
});
