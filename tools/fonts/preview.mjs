import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  const title=(await readFile(new URL('../../assets/resources/fonts/afterglow-modern-title.ttf',import.meta.url))).toString('base64');
  const body=(await readFile(new URL('../../assets/resources/fonts/afterglow-modern-body.ttf',import.meta.url))).toString('base64');
  const digits=(await readFile(new URL('../../assets/resources/art/afterglow-damage-digits-v6.png',import.meta.url))).toString('base64');
  const data=await page.evaluate(async({title,body,digits})=>{
    for(const [name,data] of [['AfterglowTitle',title],['AfterglowBody',body]]){
      const font=new FontFace(name,`url(data:font/ttf;base64,${data})`);document.fonts.add(await font.load());
    }
    const c=document.createElement('canvas');c.width=1000;c.height=740;
    const g=c.getContext('2d');g.fillStyle='#201e2b';g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#e0ad7d';g.font='16px AfterglowBody';g.fillText('AFTERGLOW · 余晖列车',48,46);
    g.fillStyle='#f4ddba';g.font='58px AfterglowTitle';g.fillText('余晖列车',44,124);
    g.font='34px AfterglowTitle';g.fillText('下一站  ·  车厢工坊',48,189);
    g.fillStyle='#ddd0c0';g.font='25px AfterglowBody';g.fillText('相邻车厢触发共鸣，让火焰与电流一起穿过长夜。',48,245);
    g.fillStyle='#b7b3c4';g.font='21px AfterglowBody';g.fillText('耐久 128 / 200   护盾 45   弹药 16   攻击 +20%   射程 →',48,286);
    g.strokeStyle='#645260';g.beginPath();g.moveTo(48,316);g.lineTo(952,316);g.stroke();
    const image=new Image();image.src=`data:image/png;base64,${digits}`;await image.decode();
    const groups=[['普通命中','18',0,48,69],['大额伤害','64',1,236,85],['持续伤害','3.5',2,424,60],['护盾损耗','18',3,612,66],['列车受伤','-12',4,800,69]];
    for(const [name,value,row,x,height] of groups){
      g.font='20px AfterglowBody';g.fillStyle='#baaab4';g.fillText(name,x,358);
      let dx=x;
      if(row===4){g.strokeStyle='#f18788';g.lineWidth=2;g.beginPath();g.moveTo(x,455);g.lineTo(x+88,455);g.stroke();}
      if(row===1){g.strokeStyle='#e9b976';g.lineWidth=2;g.beginPath();g.moveTo(x-14,425);g.lineTo(x-24,412);g.moveTo(x+98,425);g.lineTo(x+110,410);g.stroke();}
      if(row===2){g.fillStyle='#d3c0ea';g.beginPath();g.arc(x-8,425,1.5,0,Math.PI*2);g.fill();}
      if(row===3){g.strokeStyle='#a7edf3';g.lineWidth=2;g.beginPath();g.moveTo(x-17,409);g.lineTo(x-5,409);g.lineTo(x-6,425);g.lineTo(x-11,431);g.lineTo(x-16,425);g.closePath();g.stroke();}
      for(const char of value){
        const step=height*(char==='.'?.17:char==='-'?.33:row===1?.54:row===2||row===4?.44:.49);
        const index='0123456789.-'.indexOf(char);g.drawImage(image,index*96,row*128,96,128,dx+step/2-height*.375,390,96*height/128,height);
        dx+=step;
      }
      g.font='15px AfterglowBody';g.fillStyle='#baaab4';g.fillText(['短跳 · 轻落','撑开 · 急停','直立 · 缓升','盾标 · 浮升','警示 · 下坠'][row],x,478);
    }
    g.font='16px AfterglowBody';g.fillStyle='#bdced8';g.fillText('AFTERGLOW WAKE · 疾行光迹数字',48,516);
    for(const [i,char] of [...'0123456789.-'].entries())g.drawImage(image,i*96,0,96,128,40+i*75,535,51,68);
    g.fillStyle='#b7b3c4';g.fillText('小尺寸阅读检查',48,658);
    let dx=265;
    for(const [row,value]of ['128','64','3.5','18','-12'].entries()){
      for(const char of value){
        const step=char==='.'?5.8:char==='-'?11.2:row===1?18.4:row===2||row===4?15:16.7;
        g.drawImage(image,'0123456789.-'.indexOf(char)*96,row*128,96,128,dx+step/2-12.75,635,25.5,34);dx+=step;
      }dx+=36;
    }
    g.font='15px AfterglowBody';g.fillText('同一原创字族，五种情景：字重、倾角、色彩、标记与运动共同区分',48,708);
    return c.toDataURL('image/png').split(',')[1];
  },{title,body,digits});
  const directory=new URL('../../artifacts/typography/',import.meta.url);await mkdir(directory,{recursive:true});
  await writeFile(new URL('type-specimen-v6.png',directory),Buffer.from(data,'base64'));
}finally{await browser.close();}

