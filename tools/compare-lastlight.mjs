import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const reference=await readFile(new URL('../docs/art-directions/last-light-battle-concept-v1.png',import.meta.url));
const runtime=await readFile(new URL('../artifacts/lastlight/battle.png',import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:980,height:880}});
 await page.setContent(`<html><body style="margin:0;padding:10px;background:#132a2c;color:#f4e4be;display:flex;gap:20px;font:15px sans-serif"><section><p style="margin:0 0 8px">参考主题</p><img width="470" height="836" src="data:image/png;base64,${reference.toString('base64')}"></section><section><p style="margin:0 0 8px">运行画面 · 受控编组</p><img width="470" height="836" src="data:image/png;base64,${runtime.toString('base64')}"></section></body></html>`);
 await page.locator('img').last().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/lastlight/comparison.png',import.meta.url))});
}finally{await browser.close();}
