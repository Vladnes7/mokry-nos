import { createRequire } from 'node:module';
const require=createRequire('/Users/vladislav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const sharp=require('sharp');
// Composition crops only: generated full-body photos become the same bust
// silhouettes as the reference. Alpha is preserved; no background is painted.
const crops={cavapoo:{left:85,top:50,width:855,height:865},yorkie:null,cat:null,beagle:null};
for(const [name,crop] of Object.entries(crops)){
 let img=sharp(`public/images/${name}.png`);const m=await img.metadata();
 const c=crop||{left:Math.round(m.width*.08),top:Math.round(m.height*.04),width:Math.round(m.width*.84),height:Math.round(Math.min(m.height*.65,m.width*.95))};
 await img.extract(c).resize({width:640}).webp({quality:92,alphaQuality:100}).toFile(`public/images/${name}-peek.webp`);
}
await sharp('public/images/cavapoo-muddy.png').resize(360,360,{fit:'cover'}).webp({quality:90}).toFile('public/images/chip-muddy.webp');
await sharp('public/images/cavapoo.png').extract({left:100,top:65,width:820,height:820}).resize(360,360).webp({quality:92}).toFile('public/images/chip-fluffy.webp');
