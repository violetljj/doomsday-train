// Original Afterglow Wake: closed, optically drawn silhouettes, not stroked font skeletons.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const paths={
 '0':'M40 3C55 9 57 25 52 47C47 71 34 85 17 84C2 81 0 64 5 42C10 20 22 5 40 3Z M35 17C27 19 21 32 17 49C13 66 15 73 21 72C29 69 36 54 40 37C43 23 41 17 35 17Z',
 '1':'M7 24L38 3L47 4L30 81L13 85L29 20L7 29Z',
 '2':'M6 24C16 5 33 0 46 7C58 14 54 31 44 42L18 66L51 62L44 79L0 84L3 70L33 37C40 29 41 19 35 16C28 12 20 17 13 28Z',
 '3':'M8 15C24 3 45 1 51 12C58 24 49 38 37 43C54 46 50 66 37 77C24 88 8 86 0 75L8 61C13 74 26 77 34 66C44 52 30 48 17 51L21 39C34 40 45 23 37 17C31 12 20 18 12 24Z',
 '4':'M34 5L10 50L31 48L38 26L52 19L45 47L57 44L51 58L42 60L36 81L20 85L27 61L0 66L2 52L21 10Z',
 '5':'M16 8L55 3L48 18L25 19L19 36C38 26 55 37 48 59C41 83 16 94 0 77L8 63C16 78 30 74 35 60C41 42 25 43 10 50L5 46Z',
 '6':'M50 4C27 14 14 33 12 54C18 39 36 32 46 42C60 58 40 87 20 85C-1 84 0 62 7 41C15 19 30 7 50 4Z M30 48C21 50 13 65 17 72C24 80 35 67 36 57C37 51 35 47 30 48Z',
 '7':'M8 8L58 3L53 17C36 34 25 55 19 80L0 85C11 54 24 35 42 19L3 25Z',
 '8':'M35 3C57 0 61 23 40 40C61 53 39 88 16 85C-8 81 0 57 19 43C2 31 15 6 35 3Z M34 14C22 16 20 31 29 35C39 28 44 15 34 14Z M27 50C14 59 10 74 20 74C31 73 39 57 27 50Z',
 '9':'M36 3C58 4 54 29 46 49C35 72 20 82 0 86C19 73 33 57 38 40C24 54 6 53 4 38C1 20 20 2 36 3Z M33 15C22 16 13 33 19 39C27 47 40 28 40 21C40 17 37 14 33 15Z',
 '.':'M23 70L36 67L32 81L19 84Z', '-':'M12 43L48 38L45 49L9 54Z',
};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 const encoded=await page.evaluate(paths=>{
   const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=640;
   const g=canvas.getContext('2d'),colors=['#FFF7ED','#FFE7D4','#DCCFF3','#C3F5EF','#FFB4B4'];
   for(let row=0;row<5;row++)for(const [i,char]of [...'0123456789.-'].entries()){
     g.save();g.beginPath();g.rect(i*96,row*128,96,128);g.clip();
     // Forward rake belongs to the silhouette; calm channels partially straighten it.
     g.translate(i*96+48,row*128+64);
     g.transform(row===1?1.08:row===2?.86:1,0,row===2||row===3?.16:row===4?.1:-.03,1,0,0);g.translate(-29,-44);
     const path=new Path2D(paths[char]);g.lineJoin='round';
     g.strokeStyle='#171D31';g.lineWidth=row===1?5:3;g.stroke(path);g.fillStyle=colors[row];g.fill(path,'evenodd');
     if(row===1){
       // A restrained luminous edge follows the ink, never a bevel or stacked shadow.
       g.save();g.clip(path,'evenodd');g.fillStyle='#FFB99E';
       g.beginPath();g.moveTo(-5,70);g.lineTo(64,48);g.lineTo(64,90);g.lineTo(-5,90);g.fill();g.restore();
     }
     if(row===3){
       g.save();g.clip(path,'evenodd');g.fillStyle='#6EC8D0';g.fillRect(-3,49,65,3);g.restore();
     }
     g.restore();
   }
   const veil=document.createElement('canvas');veil.width=4;veil.height=256;
   const vg=veil.getContext('2d'),gradient=vg.createLinearGradient(0,256,0,0);
   gradient.addColorStop(0,'rgba(27,32,53,0)');gradient.addColorStop(.55,'rgba(27,32,53,.57)');gradient.addColorStop(1,'rgba(27,32,53,.75)');
   vg.fillStyle=gradient;vg.fillRect(0,0,4,256);
   return {digits:canvas.toDataURL('image/png').split(',')[1],veil:veil.toDataURL('image/png').split(',')[1]};
 },paths);
 const asset=new URL('../assets/resources/art/afterglow-damage-digits-v6.png',import.meta.url);
 await writeFile(asset,Buffer.from(encoded.digits,'base64'));
 let meta;try{meta=JSON.parse(await readFile(new URL(asset.href+'.meta'),'utf8'));}catch{
   meta=JSON.parse(await readFile(new URL('../assets/resources/art/afterglow-damage-digits-v4.png.meta',import.meta.url),'utf8'));
   meta=JSON.parse(JSON.stringify(meta).replaceAll(meta.uuid,randomUUID()).replaceAll('afterglow-damage-digits-v4','afterglow-damage-digits-v6'));
 }
 await writeFile(new URL(asset.href+'.meta'),JSON.stringify(meta,null,2)+'\n');
 const veilAsset=new URL('../assets/resources/art/afterglow-hud-veil-v1.png',import.meta.url);
 await writeFile(veilAsset,Buffer.from(encoded.veil,'base64'));
 let veilMeta;try{veilMeta=JSON.parse(await readFile(new URL(veilAsset.href+'.meta'),'utf8'));}catch{
   veilMeta=JSON.parse(JSON.stringify(meta).replaceAll(meta.uuid,randomUUID()).replaceAll('afterglow-damage-digits-v6','afterglow-hud-veil-v1'));
 }
 Object.assign(veilMeta.subMetas.f9941.userData,{width:4,height:256,rawWidth:4,rawHeight:256,offsetX:0,offsetY:0,trimX:0,trimY:0});
 delete veilMeta.subMetas.f9941.userData.vertices;
 await writeFile(new URL(veilAsset.href+'.meta'),JSON.stringify(veilMeta,null,2)+'\n');
 console.log('Afterglow Wake v6: original filled silhouettes, tapered strokes and asymmetric counters.');
}finally{await browser.close();}
