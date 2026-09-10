// Original curved Afterglow Signal family: shared skeleton, five semantic weights.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const paths={
 '0':'M29 8C13 8 9 22 9 44C9 66 13 80 29 80C45 80 49 66 49 44C49 22 45 8 29 8Z',
 '1':'M12 23Q25 17 32 8V80',
 '2':'M9 25C11 4 44 1 49 21C55 42 17 51 9 79H50',
 '3':'M10 12C40 0 56 16 46 32Q42 42 27 43C57 42 59 69 42 78Q25 86 8 74',
 '4':'M38 9L9 56Q7 60 15 60H52 M41 32V80',
 '5':'M49 8H14L11 41C29 35 49 39 49 60C49 81 24 87 8 73',
 '6':'M45 11C25 0 7 28 9 57C11 88 49 90 49 60C49 36 13 36 9 57',
 '7':'M8 8H50L22 80',
 '8':'M29 42C6 35 5 8 29 8C53 8 52 35 29 42C2 49 2 80 29 80C56 80 56 49 29 42Z',
 '9':'M49 33C47 3 9 0 9 30C9 54 44 54 49 33C51 61 34 92 13 77',
 '.':'M29 79L29.1 79', '-':'M14 44H44',
};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 const encoded=await page.evaluate(paths=>{
   const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=640;
   const g=canvas.getContext('2d'),weights=[12,17,8.5,11,13],colors=['#fff8ef','#ffd5bd','#d7c9ef','#b9edf0','#ffa6a5'];
   for(let row=0;row<5;row++)for(const [i,char]of [...'0123456789.-'].entries()){
     g.save();g.beginPath();g.rect(i*96,row*128,96,128);g.clip();
     g.translate(i*96+48,row*128+64);g.transform(row===1?1.05:1,0,row===1?-.16:row===0?-.06:0,1,0,0);g.translate(-29,-44);
     const path=new Path2D(paths[char]);g.lineJoin='round';g.lineCap=char==='.'?'round':'butt';
     g.strokeStyle='#1d2238';g.lineWidth=weights[row]+3.5;g.stroke(path);
     g.strokeStyle=colors[row];g.lineWidth=weights[row];g.stroke(path);g.restore();
   }
   const veil=document.createElement('canvas');veil.width=4;veil.height=256;
   const vg=veil.getContext('2d'),gradient=vg.createLinearGradient(0,256,0,0);
   gradient.addColorStop(0,'rgba(27,32,53,0)');gradient.addColorStop(.55,'rgba(27,32,53,.57)');gradient.addColorStop(1,'rgba(27,32,53,.75)');
   vg.fillStyle=gradient;vg.fillRect(0,0,4,256);
   return {digits:canvas.toDataURL('image/png').split(',')[1],veil:veil.toDataURL('image/png').split(',')[1]};
 },paths);
 const asset=new URL('../assets/resources/art/afterglow-damage-digits-v5.png',import.meta.url);
 await writeFile(asset,Buffer.from(encoded.digits,'base64'));
 let meta;try{meta=JSON.parse(await readFile(new URL(asset.href+'.meta'),'utf8'));}catch{
   meta=JSON.parse(await readFile(new URL('../assets/resources/art/afterglow-damage-digits-v4.png.meta',import.meta.url),'utf8'));
   meta=JSON.parse(JSON.stringify(meta).replaceAll(meta.uuid,randomUUID()).replaceAll('afterglow-damage-digits-v4','afterglow-damage-digits-v5'));
 }
 await writeFile(new URL(asset.href+'.meta'),JSON.stringify(meta,null,2)+'\n');
 const veilAsset=new URL('../assets/resources/art/afterglow-hud-veil-v1.png',import.meta.url);
 await writeFile(veilAsset,Buffer.from(encoded.veil,'base64'));
 let veilMeta;try{veilMeta=JSON.parse(await readFile(new URL(veilAsset.href+'.meta'),'utf8'));}catch{
   veilMeta=JSON.parse(JSON.stringify(meta).replaceAll(meta.uuid,randomUUID()).replaceAll('afterglow-damage-digits-v5','afterglow-hud-veil-v1'));
 }
 Object.assign(veilMeta.subMetas.f9941.userData,{width:4,height:256,rawWidth:4,rawHeight:256,offsetX:0,offsetY:0,trimX:0,trimY:0});
 delete veilMeta.subMetas.f9941.userData.vertices;
 await writeFile(new URL(veilAsset.href+'.meta'),JSON.stringify(veilMeta,null,2)+'\n');
 console.log('Afterglow Signal v5: original curved numeral family, 5 weights/colors, no bevel or extrusion.');
}finally{await browser.close();}
