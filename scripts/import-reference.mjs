import fs from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

// Keep a reproducible, local snapshot separate from the adapted deliverable.
const origin = 'https://tubwell.visuvate.com';
const root = path.resolve('.reference');
const queue = ['/','/grooming/','/studio/','/shop/','/book/','/privacy/','/terms/'];
const seen = new Set();
const assets = new Set();
async function fetchFile(url, target) {
  try { return await fs.readFile(target); } catch {}
  let error;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      await fs.mkdir(path.dirname(target),{recursive:true});
      await run('curl',['--fail','--silent','--show-error','--location','--max-time','30',url,'--output',target]);
      return await fs.readFile(target);
    } catch(e) { error=e; }
  }
  throw error;
}
function rememberAsset(raw, base=origin) {
  if(!raw || raw.startsWith('data:') || raw.startsWith('#'))return;
  try {
    const url=new URL(raw,base);
    if(url.origin===origin && url.pathname.startsWith('/wp-content/') && !/\.php$/.test(url.pathname)) assets.add(url.origin+url.pathname);
  } catch {}
}
while(queue.length) {
  const route=queue.shift();
  if(seen.has(route))continue;
  seen.add(route);
  const html=(await fetchFile(origin+route,path.join(root,'pages',route,'index.html'))).toString();
  const {document}=parseHTML(html);
  for(const a of document.querySelectorAll('a[href]')) {
    try {
      const u=new URL(a.getAttribute('href'),origin+route);
      if(u.origin===origin && /^\/shop\/[a-z-]+\/$/.test(u.pathname) && !seen.has(u.pathname))queue.push(u.pathname);
    }catch{}
  }
  for(const el of document.querySelectorAll('[src],[href],[srcset]')) {
    rememberAsset(el.getAttribute('src'));rememberAsset(el.getAttribute('href'));
    for(const entry of (el.getAttribute('srcset')||'').split(','))rememberAsset(entry.trim().split(/\s/)[0]);
  }
  for(const match of html.matchAll(/https:\/\/tubwell\.visuvate\.com\/wp-content\/[^\s"'<>),]+/g))rememberAsset(match[0]);
  console.log(`page ${route}`);
}
const done=new Set();
while([...assets].some(x=>!done.has(x))) {
  const batch=[...assets].filter(x=>!done.has(x));
  for(let i=0;i<batch.length;i+=6) {
    await Promise.all(batch.slice(i,i+6).map(async url=>{
      done.add(url);
      const u=new URL(url); const bytes=await fetchFile(url,path.join(root,u.pathname));
      if(/\.(css|js)$/.test(u.pathname)) {
        const text=bytes.toString();
        for(const m of text.matchAll(/url\(\s*["']?([^\s)"']+)/g))rememberAsset(m[1],url);
      }
    }));
    if(i%30===0)console.log(`assets ${done.size}/${assets.size}`);
  }
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({origin,routes:[...seen],assets:[...assets]},null,2));
const texts=new Set();
for(const route of seen) {
 const {document}=parseHTML(await fs.readFile(path.join(root,'pages',route,'index.html'),'utf8'));
 function walk(n) {
  if(n.nodeType===3){const s=n.textContent.replace(/\s+/g,' ').trim();if(s && /[A-Za-z]/.test(s))texts.add(s);return;}
  if(['SCRIPT','STYLE','SVG'].includes(n.tagName))return;
  for(const c of n.childNodes||[])walk(c);
 }
 walk(document.body);
 for(const n of document.querySelectorAll('[placeholder],[aria-label],[alt]'))for(const a of ['placeholder','aria-label','alt']){const v=n.getAttribute(a);if(v&&/[A-Za-z]/.test(v))texts.add(v);}
}
await fs.writeFile(path.join(root,'texts.json'),JSON.stringify([...texts],null,2));
const fonts={
 'onest-regular':'https://fonts.gstatic.com/s/onest/v11/gNMZW3F-SZuj7zOT0IfSjTS16cPh9R-Zsg.ttf',
 'onest-medium':'https://fonts.gstatic.com/s/onest/v11/gNMZW3F-SZuj7zOT0IfSjTS16cPhxx-Zsg.ttf',
 'onest-semibold':'https://fonts.gstatic.com/s/onest/v11/gNMZW3F-SZuj7zOT0IfSjTS16cPhKxiZsg.ttf',
 'onest-bold':'https://fonts.gstatic.com/s/onest/v11/gNMZW3F-SZuj7zOT0IfSjTS16cPhEhiZsg.ttf',
 'onest-extrabold':'https://fonts.gstatic.com/s/onest/v11/gNMZW3F-SZuj7zOT0IfSjTS16cPhdRiZsg.ttf',
 'caveat-bold':'https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf'
};
await Promise.all(Object.entries(fonts).map(([name,url])=>fetchFile(url,path.resolve('public/fonts',name+'.ttf'))));
console.log(JSON.stringify({pages:seen.size,assets:assets.size,texts:texts.size}));
