import fs from 'node:fs/promises';
import path from 'node:path';
import {parseHTML} from 'linkedom';
const [route='/',start='0',end='999',length='9999']=process.argv.slice(2);
const {document}=parseHTML(await fs.readFile(path.join('site',route,'index.html'),'utf8'));
const out=[];
function walk(n){
 if(['SCRIPT','STYLE'].includes(n.tagName))return;
 if(n.nodeType===3){const s=n.textContent.replace(/\s+/g,' ').trim();if(/[A-Za-z]{3}/.test(s)&&!s.includes('@'))out.push(s);}
 for(const c of n.childNodes||[])walk(c);
}
walk(document.querySelector('main')||document.body);
console.log([...new Set(out)].slice(Number(start),Number(end)).map(s=>s.slice(0,Number(length))).join('\n'));
