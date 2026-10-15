import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';

const base=process.env.PAGES_BASE||'/mokry-nos/';
const {routes}=JSON.parse(await fs.readFile('site/manifest.json','utf8'));
let links=0;
for(const route of routes){
 const {document}=parseHTML(await fs.readFile(`dist${route}index.html`,'utf8'));
 for(const el of document.querySelectorAll('[src],a[href],link[href],[srcset]')){
  const urls=[el.getAttribute('src')||el.getAttribute('href'),...(el.getAttribute('srcset')||'').split(',').map(x=>x.trim().split(/\s/)[0])];
  for(const url of urls){
   if(!url?.startsWith('/')||url.startsWith('//'))continue;
   assert.ok(url.startsWith(base),`${route}: unprefixed ${url}`);
   let file=url.slice(base.length).split(/[?#]/)[0];
   if(!file||file.endsWith('/'))file+='index.html';
   await fs.access(`dist/${decodeURI(file)}`);
   links++;
  }
 }
 for(const el of document.querySelectorAll('[data-ajax]'))assert.ok(el.getAttribute('data-ajax').startsWith(base));
}
const demo=await fs.readFile('dist/assets/demo.js','utf8');
assert.ok(demo.includes(`${base}__demo__/request`));
await fs.access('dist/.nojekyll');
console.log(`GitHub Pages checks passed: ${routes.length} pages, ${links} local links and image variants, demo transport.`);
