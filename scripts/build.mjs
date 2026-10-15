import fs from 'node:fs/promises';
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist',{recursive:true});
await fs.cp('site','dist',{recursive:true});
await fs.cp('public','dist',{recursive:true,filter:source=>!/[\\/]images[\\/]generated(?:[\\/]|$)/.test(source)&&!/[\\/]images[\\/][^/]+\.png$/.test(source)});
console.log('Built local static site in dist/');
