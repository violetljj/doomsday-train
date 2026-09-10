// Original Afterglow Rail numerals. Authored outlines, no font source.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const glyphs={
  '0':'M11 0H45L56 11V77L45 88H11L0 77V11Z M18 15L16 18V70L19 73H37L40 70V18L37 15Z',
  '1':'M10 15L29 0H42V73H53V88H9V73H25V22L10 33Z',
  '2':'M0 13L13 0H43L56 13V34L44 48L17 70V73H56V88H0V65L11 53L38 31V19L34 15H20L16 19V29H0Z',
  '3':'M0 0H43L56 13V33L46 43L56 53V75L43 88H0V72H35L40 67V57L34 51H13V36H34L40 30V20L35 15H0Z',
  '4':'M27 0H46L17 53H36V32H52V53H60V69H52V88H36V69H0V52Z',
  '5':'M0 0H56V16H16V34H43L56 47V75L43 88H0V72H35L40 67V55L35 50H0Z',
  '6':'M15 0H54V16H23L16 24V35H43L56 48V75L43 88H13L0 75V18Z M16 51V68L21 73H35L40 68V56L35 51Z',
  '7':'M0 0H56V17L30 88H11L38 16H0Z',
  '8':'M13 0H43L56 13V33L47 43L56 53V75L43 88H13L0 75V53L9 43L0 33V13Z M20 15L16 19V30L21 35H35L40 30V19L36 15Z M21 51L16 56V68L21 73H35L40 68V56L35 51Z',
  '9':'M13 0H43L56 13V70L41 88H2V72H33L40 64V53H13L0 40V13Z M21 15L16 20V32L21 37H40V20L35 15Z',
  '.':'M23 74H33L36 77V85L33 88H23L20 85V77Z',
  '-':'M12 39H44V53H12Z',
};
const fine={
  '0':'M19 8H37L48 19V69L37 80H19L8 69V19Z',
  '1':'M13 22L30 8H34V80 M16 80H48',
  '2':'M8 23V18L18 8H38L48 18V31L8 67V80H48',
  '3':'M8 8H38L48 18V31L36 43H22 M36 43L48 55V70L38 80H8',
  '4':'M35 8L8 56H49 M42 31V80',
  '5':'M48 8H8V40H37L48 51V69L37 80H8',
  '6':'M46 8H21L8 21V68L20 80H36L48 68V53L37 42H8',
  '7':'M8 8H48L20 80',
  '8':'M18 8H38L48 18V31L37 43H19L8 31V18Z M19 43L8 54V69L19 80H37L48 69V54L37 43',
  '9':'M48 46H20L8 34V20L20 8H36L48 20V67L35 80H10',
  '.':'M28 78V81', '-':'M14 44H42',
};
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  const png=await page.evaluate(({glyphs,fine})=>{
    const c=document.createElement('canvas');c.width=1152;c.height=640;
    const g=c.getContext('2d');g.lineJoin='round';
    for(let row=0;row<5;row++)for(const [i,char] of [...'0123456789.-'].entries()){
      g.save();g.beginPath();g.rect(i*96,row*128,96,128);g.clip();
      g.translate(i*96+48,row*128+64);g.transform(row===1?1.12:row===4?.9:1,0,row===1?-.2:row===0?-.12:0,1,0,0);g.translate(-28,-44);
      if(row===2){
        const line=new Path2D(fine[char]);g.lineCap='round';g.strokeStyle='#201c29';g.lineWidth=14;g.stroke(line);
        g.strokeStyle='#d3c0ea';g.lineWidth=8;g.stroke(line);g.restore();continue;
      }
      const path=new Path2D(glyphs[char]);
      g.save();g.translate(row===1?3:1.5,row===1?6:3);g.strokeStyle=row===4?'#601f36':'#191923';g.lineWidth=row===1?10:6;
      g.stroke(path);g.fillStyle='#191923';g.fill(path,'evenodd');g.restore();
      if(row===3){g.fillStyle='#213343';g.fill(path,'evenodd');g.strokeStyle='#a7edf3';g.lineWidth=5;g.stroke(path);g.restore();continue;}
      g.strokeStyle=row===1?'#9a5d26':row===4?'#a6374b':'#25232f';g.lineWidth=row===1?5:4;g.stroke(path);
      const face=g.createLinearGradient(0,0,0,88);face.addColorStop(0,row===1?'#fff5c8':row===4?'#fff1df':'#ffffff');face.addColorStop(.55,row===1?'#ffd27c':row===4?'#ffb19c':'#fff9eb');face.addColorStop(1,row===1?'#db8a40':row===4?'#f17a7c':'#dfc8ad');
      g.fillStyle=face;g.fill(path,'evenodd');
      if(row===1){g.strokeStyle='#fff1bb';g.lineWidth=1;g.stroke(path);}
      g.restore();
    }
    return c.toDataURL('image/png').split(',')[1];
  },{glyphs,fine});
  const target=new URL('../assets/resources/art/afterglow-damage-digits-v4.png',import.meta.url);
  await writeFile(target,Buffer.from(png,'base64'));
  const metaTarget=new URL(`${target.href}.meta`);let meta;
  try{meta=JSON.parse(await readFile(metaTarget,'utf8'));}catch{
    meta=JSON.parse(await readFile(new URL('../assets/resources/art/afterglow-damage-digits-v2.png.meta',import.meta.url),'utf8'));
    meta=JSON.parse(JSON.stringify(meta).replaceAll(meta.uuid,randomUUID()).replaceAll('afterglow-damage-digits-v2','afterglow-damage-digits-v4'));
  }
  Object.assign(meta.subMetas.f9941.userData,{offsetX:0,offsetY:0,trimX:0,trimY:0,width:1152,height:640,rawWidth:1152,rawHeight:640,trimType:'none',packable:false});
  delete meta.subMetas.f9941.userData.vertices;
  await writeFile(metaTarget,JSON.stringify(meta,null,2)+'\n');
  const out=new URL('../artifacts/typography/',import.meta.url);await mkdir(out,{recursive:true});
  const paths=[...'0123456789.-'].map((char,i)=>`<g transform="translate(${i*80+20} 20)"><path d="${glyphs[char]}" fill="#fff6e6" fill-rule="evenodd"/></g>`).join('');
  await writeFile(new URL('afterglow-rail-original.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="128" viewBox="0 0 980 128"><rect width="980" height="128" fill="#25232f"/>${paths}</svg>`);
  console.log('Original Afterglow Rail v4: five contextual rows, 1152x640 RGBA, original solid and monoline vector glyphs.');
} finally {await browser.close();}
