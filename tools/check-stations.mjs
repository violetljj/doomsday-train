import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out=new URL('../artifacts/stations/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
try {
  page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]);
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{
    const cc=await System.import('cc');
    const find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);
    globalThis.stationGame=find(cc.director.getScene());globalThis.stationCC=cc;
  });
  async function clickLocal(x,y){
    const p=await page.evaluate(({x,y})=>{
      const cc=globalThis.stationCC,g=globalThis.stationGame;
      const world=g.node.getComponent(cc.UITransform).convertToWorldSpaceAR(new cc.Vec3(x,y,0));
      const size=cc.view.getVisibleSize(),origin=cc.view.getVisibleOrigin();
      const box=document.querySelector('canvas').getBoundingClientRect();
      const scale=Math.min(box.width/size.width,box.height/size.height);
      return {x:box.x+(box.width-size.width*scale)/2+(world.x-origin.x)*scale,
        y:box.y+(box.height+size.height*scale)/2-(world.y-origin.y)*scale};
    },{x,y});await page.mouse.click(p.x,p.y);
  }
  const snapshot=()=>page.evaluate(()=>__doomsday.snapshot());
  await clickLocal(0,-351);await page.waitForFunction(()=>__doomsday.snapshot().phase==='combat');
  await clickLocal(0,-580); // 2x using the real control.
  await page.waitForFunction(()=>__doomsday.snapshot().phase==='supply',{},{timeout:25000});
  assert.equal((await snapshot()).stationChoices,false);
  await clickLocal(0,184);await page.waitForFunction(()=>__doomsday.snapshot().phase==='workshop');
  await page.waitForFunction(()=>stationGame.hitAreas.some(a=>a.y===-303));
  await page.waitForFunction(()=>stationGame.workshopArt?.active);
  await page.screenshot({path:fileURLToPath(new URL('workshop-390.png',out))});
  await clickLocal(0,-303);
  await page.waitForFunction(()=>__doomsday.snapshot().phase==='combat' && stationGame.hitAreas.some(a=>a.x===222));
  await clickLocal(222,-483);
  await page.waitForFunction(()=>stationGame.workshopArt?.active && !stationGame.model.pendingCar);
  await page.screenshot({path:fileURLToPath(new URL('workshop-arrange-390.png',out))});
  await clickLocal(0,-303);
  await page.waitForFunction(()=>__doomsday.snapshot().stationChoices,{},{timeout:25000});
  const arrived=await snapshot();
  await page.screenshot({path:fileURLToPath(new URL('station-390.png',out))});
  await clickLocal(0,-1); // military route, second card
  await page.waitForFunction(()=>__doomsday.snapshot().route==='arsenal');
  await page.waitForFunction(()=>stationGame.model.events.some(e=>e.type==='route_escort'),{},{timeout:8000});
  const departed=await snapshot();
  assert.equal(departed.phase,'combat');assert.equal(departed.route,'arsenal');
  await page.screenshot({path:fileURLToPath(new URL('route-390.png',out))});
  assert.deepEqual(errors,[]);
  await writeFile(new URL('browser-check.json',out),JSON.stringify({method:'Natural progression, real pointer controls, 2x. No combat state edits.',arrived,departed,errors},null,2));
  console.log('Browser station flow passed: tutorial install → station → military upgrade → escort, 390x844 at 2x.');
} catch(error) {
  if(page){await page.screenshot({path:fileURLToPath(new URL('failure.png',out))});
    console.log(await page.evaluate(()=>({state:__doomsday.snapshot().phase,size:stationCC.view.getVisibleSize(),origin:stationCC.view.getVisibleOrigin(),position:stationGame.node.worldPosition,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()})));}
  throw error;
} finally {await browser.close();}
