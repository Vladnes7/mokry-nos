import fs from 'node:fs/promises';
import path from 'node:path';
import './build.mjs';

// GitHub project sites are served below /<repository>/ rather than /.
const base=process.env.PAGES_BASE||'/mokry-nos/';
if(!/^\/[a-zA-Z0-9_-]+\/$/.test(base))throw new Error('PAGES_BASE must be /repository-name/');
let rewritten=0;
async function walk(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!/\.(?:html|css|js|svg)$/.test(file))continue;
  const original=await fs.readFile(file,'utf8');
  const adapted=original
   .replace(/(["'`(=\s])\/(?=(?:assets|wp-content|images|fonts|grooming|shop|studio|book|privacy|terms|__demo__)\/)/g,(_,lead)=>lead+base)
   .replace(/(["'`])\/(#[^"'`]*|)(["'`])/g,(_,open,hash,close)=>open+base+hash+close);
  if(adapted!==original){await fs.writeFile(file,adapted);rewritten++;}
 }
}
await walk('dist');
await fs.writeFile('dist/.nojekyll','');
console.log(`Prepared GitHub Pages at ${base}: ${rewritten} text assets adapted.`);
