import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('/Users/vladislav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const sharp=require('sharp');
const plan=JSON.parse(await fs.readFile('src/image-plan.json','utf8'));
const dir='public/wp-content/uploads';
const normal=f=>{
 const stem=f.replace(/\.[^.]+$/,'');
 return plan.jobs.find(j=>stem===j.key||stem.startsWith(j.key+'-'))?.key??stem.replace(/(?:-\d{2,4}(?:x\d{2,4})?)+$/,'');
};
const files=await fs.readdir(dir);
const extras={
 'chip-muddy':'public/images/chip-muddy.webp','chip-fluffy':'public/images/chip-fluffy.webp',
 'peek3-cavapoo':'public/images/cavapoo-peek.webp','peek3-yorkie':'public/images/yorkie-peek.webp',
 'peek3-cat':'public/images/cat-peek.webp','peek3-beagle':'public/images/beagle-peek.webp',
 'size-s':'public/images/yorkie-peek.webp','size-m':'public/images/cavapoo-peek.webp',
 'size-l':'public/images/generated/card-samoyed.png'
};
const report=[];
for(const f of files){
 if(!/\.(webp|png|jpe?g)$/.test(f))continue;
 const key=normal(f),job=plan.jobs.find(j=>j.key===key);
 const input=extras[key]||(job?`public/images/generated/${key}.png`:null);
 if(!input)continue;
 try{await fs.access(input);}catch{continue;}
 const target=`${dir}/${f}`;
 const original=await sharp(`.reference/wp-content/uploads/${f}`).metadata();
 let image=sharp(input);
 if(job?.group==='product')image=image.trim({threshold:10}).resize(original.width,original.height,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}});
 else image=image.resize(original.width,original.height,{fit:'cover',position:key.startsWith('size-')?'north':key==='g-before'||key==='g-after'?'centre':'attention'});
 await image.webp({quality:88,alphaQuality:100}).toFile(target);
 report.push({file:f,key,source:input});
}
await fs.mkdir('docs/reference',{recursive:true});
await fs.writeFile('docs/reference/image-replacements.json',JSON.stringify(report,null,2));
console.log(`Prepared ${report.length} local image variants; ${plan.jobs.length} planned photo subjects.`);
