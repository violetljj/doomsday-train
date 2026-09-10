import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  const font=await readFile(new URL('./fonts/PermanentMarker-Regular.ttf',import.meta.url));
  if(createHash('sha256').update(font).digest('hex')!=='28f82c8a7943cb8e9d599f8554da1d4fc75dbcf69b9885ad6c0611d20c6946c5')throw Error('Digit font source hash mismatch');
  const png=await page.evaluate(async(fontData)=>{
    const font=new FontFace('DamageInk',`url(data:font/ttf;base64,${fontData})`);
    document.fonts.add(await font.load());
    const c=document.createElement('canvas');c.width=1152;c.height=256;
    const g=c.getContext('2d');
    g.textAlign='center';g.textBaseline='alphabetic';g.lineJoin='round';
    for(let row=0;row<2;row++)for(const [i,char] of [...'0123456789.-'].entries()){
      g.save();
      g.beginPath();g.rect(i*96,row*128,96,128);g.clip();
      g.translate(i*96+48,row*128+96);
      g.transform(1,0,row?-.13:-.07,1,0,0);
      g.font=`${row?86:80}px DamageInk`;
      // Offset ink silhouette, narrow keyline, bright face: remains readable when tinted.
      g.strokeStyle='#191b28';g.lineWidth=row?9:7;
      g.strokeText(char,2,5);g.fillStyle='#191b28';g.fillText(char,2,5);
      g.strokeStyle='#252536';g.lineWidth=row?7:5;g.strokeText(char,0,0);
      g.fillStyle='#fffaf0';g.fillText(char,0,0);
      // Heavy impacts get a pale second edge without adding a fake critical marker.
      if(row){g.globalAlpha=.22;g.strokeStyle='#ffffff';g.lineWidth=1;g.strokeText(char,-.5,-.7);}
      g.restore();
    }
    return c.toDataURL('image/png').split(',')[1];
  },font.toString('base64'));
  const target=new URL('../assets/resources/art/afterglow-damage-digits-v2.png',import.meta.url);
  await writeFile(target,Buffer.from(png,'base64'));
  const metaTarget=new URL(`${target.href}.meta`);
  let meta;
  try{meta=JSON.parse(await readFile(metaTarget,'utf8'));}catch{
    meta=JSON.parse(await readFile(new URL('../assets/resources/art/afterglow-damage-digits.png.meta',import.meta.url),'utf8'));
    const old=meta.uuid,fresh=randomUUID();
    meta=JSON.parse(JSON.stringify(meta).replaceAll(old,fresh).replaceAll('afterglow-damage-digits','afterglow-damage-digits-v2'));
  }
  const sprite=meta.subMetas.f9941.userData;
  Object.assign(sprite,{offsetX:0,offsetY:0,trimX:0,trimY:0,width:1152,height:256,rawWidth:1152,rawHeight:256,trimType:'none',packable:false});
  delete sprite.vertices;
  await writeFile(metaTarget,JSON.stringify(meta,null,2)+'\n');
  console.log('Damage digit v2: 1152x256, 12 columns x 2 rows, 96x128 per cell; top normal, bottom heavy.');
} finally {await browser.close();}
