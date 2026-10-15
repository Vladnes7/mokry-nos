import fs from 'node:fs/promises';
const plan=JSON.parse(await fs.readFile('src/image-plan.json','utf8'));
const [startArg='0',countArg='4']=process.argv.slice(2);
const jobs=[];
for(const job of plan.jobs){
 try{await fs.access(`public/images/generated/${job.key}.png`);continue;}catch{}
 const shape=job.shape==='portrait'?'Vertical portrait composition 4:5. ':job.shape==='landscape'?'Horizontal landscape composition. ':'Square composition. ';
 jobs.push({...job,prompt:(job.group==='product'?plan.productStyle:plan.photoStyle)+shape+job.scene});
}
console.log(JSON.stringify(jobs.slice(Number(startArg),Number(startArg)+Number(countArg))));
