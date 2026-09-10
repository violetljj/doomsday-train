import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=new URL('../artifacts/lastlight/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:470,height:836}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url());});
 await page.goto(process.argv[2]);
 await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
 await page.evaluate(async()=>{const cc=await System.import('cc');const find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);globalThis.g=find(cc.director.getScene());globalThis.cc=cc;});
 await page.waitForFunction(()=>g.lastLightUi.length===4&&g.unitMaterial&&g.lastLightEnemyReady);
 const capture=async name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output))});
 await capture('menu');
 // Activate the live main menu action. Later compositions are explicitly seeded art fixtures.
 await page.evaluate(()=>g.hitAreas.find(a=>a.y===-351).action());
 await page.waitForFunction(()=>g.model.time>5);await capture('opening');
 await page.evaluate(()=>{
   g.model.openWorkshop();g.model.slots.fill(null);g.model.carClocks.clear();
   ['prism','fan','cannon','tesla','repair'].forEach((type,i)=>{g.model.pendingCar=type;g.model.install(i);});
   g.model.resumeWorkshop();g.model.time=187;g.model.hp=86;g.model.waveIndex=6;g.model.nextScrap=1e6;g.model.nextModifierTime=Infinity;g.model.spawnClock=-1e6;g.model.enemies=[];g.entranceRemaining=0;g.toastLife=0;g.lowMotion=true;
   const poses=[[-180,110,0],[180,110,0],[248,178,2],[-220,-115,1],[178,-112,4],[235,-177,5],[198,-315,3],[-198,-345,6],[250,-355,8],[-150,-45,7]];
   poses.forEach(([x,y,kind],i)=>{g.model.spawn(true,kind);const e=g.model.enemies.at(-1);Object.assign(e,{x,y,previousX:x,previousY:y,speed:0,hp:500,maxHp:500});});
   for(const id of ['cannon-fan','cannon-prism','tesla-repair'])g.knownRecipes.add(id);
 });
 await page.waitForTimeout(250);await page.evaluate(()=>{g.toastLife=0;g.windLessonLife=0;});await page.waitForTimeout(40);await capture('battle');
 const rendered=await page.evaluate(()=>({theme:__doomsday.snapshot().art.style,train:g.lastLightReady,enemies:g.lastLightEnemyReady,ui:g.lastLightUi.length,carriages:g.carArt.size,links:g.model.links.length}));
 assert.equal(rendered.theme,'lastlight');assert.equal(rendered.carriages,5);assert.equal(rendered.ui,4);
 await page.evaluate(()=>g.hitAreas.find(a=>a.y===-511).action());
 await page.waitForFunction(()=>g.state.startsWith('workshop:'));await capture('workshop');
 await page.evaluate(()=>{g.model.resumeWorkshop();g.model.pause();g.state='';});
 await page.waitForFunction(()=>g.state.startsWith('paused:'));await capture('pause');
 const before=await page.evaluate(()=>g.model.time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>g.model.time),before);
 await page.setViewportSize({width:390,height:844});await capture('pause-tall');
 await page.evaluate(()=>{g.model.resume();g.state='';});await page.waitForFunction(()=>g.state.startsWith('combat:'));await capture('battle-tall');
 assert.deepEqual(errors,[]);await writeFile(new URL('receipt.json',output),JSON.stringify({rendered,errors,viewport:[470,836],tallViewport:[390,844],fixture:'Seeded 5-car art fixture at 187 seconds; opening is actual combat; pause/workshop opened through live actions'},null,2));
 console.log('Last Light live integration passed');
}finally{await browser.close();}
