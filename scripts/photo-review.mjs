import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('/Users/vladislav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const sharp=require('sharp');
const plan=JSON.parse(await fs.readFile('src/image-plan.json','utf8'));
const ready=[];
for(const j of plan.jobs){try{await fs.access(`public/images/generated/${j.key}.png`);ready.push(j);}catch{}}
await fs.mkdir('docs/reference/evidence',{recursive:true});
for(let start=0;start<ready.length;start+=12){
 const jobs=ready.slice(start,start+12),layers=[];
 for(let i=0;i<jobs.length;i++){
  const j=jobs[i],left=(i%4)*240,top=Math.floor(i/4)*280;
  const photo=await sharp(`public/images/generated/${j.key}.png`).resize(230,245,{fit:'contain',background:'#eeece8'}).png().toBuffer();
  const label=Buffer.from(`<svg width="240" height="30"><rect width="240" height="30" fill="#fff8ee"/><text x="8" y="20" font-family="Arial" font-size="13" fill="#1f1b3a">${j.key}</text></svg>`);
  layers.push({input:photo,left:left+5,top},{input:label,left,top:top+245});
 }
 await sharp({create:{width:960,height:Math.ceil(jobs.length/4)*280,channels:3,background:'#fff8ee'}}).composite(layers).jpeg({quality:90}).toFile(`docs/reference/evidence/photos-${Math.floor(start/12)+1}.jpg`);
}
console.log(`Reviewed sheets prepared: ${ready.length}/${plan.jobs.length} subjects`);
