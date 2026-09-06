import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  const png=await page.evaluate(async()=>{
    await document.fonts.load('bold 72px "Segoe Print"');
    const c=document.createElement('canvas');c.width=1152;c.height=128;
    const g=c.getContext('2d');g.font='bold 72px "Segoe Print"';
    g.textAlign='center';g.textBaseline='alphabetic';g.lineJoin='round';
    for(const [i,char] of [...'0123456789.-'].entries()){
      g.strokeStyle='#282333';g.lineWidth=7;g.strokeText(char,i*96+48,92);
      g.fillStyle='#ffffff';g.fillText(char,i*96+48,92);
    }
    return c.toDataURL('image/png').split(',')[1];
  });
  await writeFile(new URL('../assets/resources/art/afterglow-damage-digits.png',import.meta.url),Buffer.from(png,'base64'));
} finally {await browser.close();}
