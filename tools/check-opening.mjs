import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {CARS} from '../assets/scripts/Catalog.ts';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=process.env.EVIDENCE_DIR?resolve(process.env.EVIDENCE_DIR):fileURLToPath(new URL('../artifacts/opening/',import.meta.url));await mkdir(output,{recursive:true});
const path=name=>resolve(output,name);
const browser=await chromium.launch({channel:'chrome',headless:true});let page;
try{
  page=await browser.newPage({viewport:{width:390,height:844},recordVideo:{dir:path('video/'),size:{width:390,height:844}}});
  const errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]);
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{const cc=await System.import('cc');const find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);globalThis.openingGame=find(cc.director.getScene());globalThis.openingCC=cc;});
  const snapshot=()=>page.evaluate(()=>__doomsday.snapshot());
  async function click(x,y){
    const p=await page.evaluate(({x,y})=>{const cc=openingCC,g=openingGame;
      const world=g.node.getComponent(cc.UITransform).convertToWorldSpaceAR(new cc.Vec3(x,y,0)),size=cc.view.getVisibleSize(),origin=cc.view.getVisibleOrigin(),box=document.querySelector('canvas').getBoundingClientRect();
      const scale=Math.min(box.width/size.width,box.height/size.height);
      return{x:box.x+(box.width-size.width*scale)/2+(world.x-origin.x)*scale,y:box.y+(box.height+size.height*scale)/2-(world.y-origin.y)*scale};},{x,y});
    await page.mouse.click(p.x,p.y);
  }
  async function capture(name){const state=await snapshot();records.push({name,...state});await page.screenshot({path:path(`${name}.png`)});return state;}
  await click(0,-351);await page.waitForFunction(()=>__doomsday.snapshot().phase==='combat');await click(0,-612);
  assert.equal((await snapshot()).speed,2,'Bottom speed control wins over arriving car hit areas');
  assert.equal((await snapshot()).phase,'combat');
  await page.waitForFunction(()=>__doomsday.snapshot().phase==='supply',null,{timeout:20000});
  await capture('first-supply');await click(0,184);
  await page.waitForFunction(()=>openingGame.lastLightPanel?.active&&__doomsday.snapshot().workshopMotion.length>0);
  await page.waitForFunction(()=>__doomsday.snapshot().workshopMotion.every(p=>Math.hypot(p.x-p.targetX,p.y-p.targetY)<1));
  const before=await capture('workshop-ready');
  const original=before.workshopMotion.find(p=>p.key.startsWith('car:'));
  await click(original.targetX,32);
  await page.waitForFunction(()=>__doomsday.snapshot().selectedSlot===0);
  await page.waitForFunction(()=>__doomsday.snapshot().workshopMotion.some(p=>p.key.startsWith('car:')&&Math.abs(p.targetX-p.x)>1));
  const moving=await snapshot();assert.equal(moving.time,before.time);records.push({name:'live-move',...moving});
  await page.waitForFunction(()=>__doomsday.snapshot().workshopMotion.every(p=>Math.hypot(p.x-p.targetX,p.y-p.targetY)<1));
  const shifted=await capture('workshop-shifted');
  assert.notEqual(shifted.workshopMotion.find(p=>p.key===original.key).targetX,original.targetX);
  // Return to the recommended empty slot, then install through the real button.
  const target=shifted.workshopMotion.find(p=>p.key===original.key).targetX;
  await click(target,32);await page.waitForFunction(()=>__doomsday.snapshot().selectedSlot===1);
  await click(0,-303);await page.waitForFunction(()=>__doomsday.snapshot().assemblyRemaining>0);
  const installed=await snapshot();assert.equal(installed.phase,'workshop');assert.equal(installed.time,before.time);
  await click(0,-303);assert.equal((await snapshot()).slots.filter(Boolean).length,2);
  await capture('assembly');
  await page.waitForFunction(()=>__doomsday.snapshot().openingFeedback.feed,null,{timeout:10000});
  await capture('wind-feed');
  await page.waitForFunction(()=>__doomsday.snapshot().openingFeedback.chainBest>=2,null,{timeout:10000});
  await capture('piercing-hit');
  await page.waitForFunction(()=>__doomsday.snapshot().stationChoices,null,{timeout:20000});
  await capture('first-station');await click(0,184);
  await page.waitForFunction(()=>openingGame.model.phase==='workshop'&&openingGame.hitAreas.some(a=>a.y===-303));await click(0,-303);
  await page.waitForFunction(()=>openingGame.model.events.some(e=>e.type==='route_reinforcement'),null,{timeout:8000});
  await capture('station-consequence');
  while(true){
    await page.waitForFunction(()=>openingGame.model.time>=60||openingGame.model.phase==='lose'||openingGame.model.stationChoices,null,{timeout:20000});
    const s=await snapshot();if(s.time>=60||s.phase==='lose')break;
    const choice=s.hp<35?2:CARS[s.offers[0].id]?.role==='offense'?0:1;
    await click(0,184-choice*185);
    await page.waitForFunction(()=>!openingGame.model.stationChoices);
    if((await snapshot()).phase==='workshop'){
      await page.waitForFunction(()=>openingGame.hitAreas.some(a=>a.y===-303));await click(0,-303);
    }
  }
  const ending=await capture('opening-end');
  assert.equal(ending.phase,'combat','The selected first-minute route should survive to the 60-second checkpoint');
  assert.ok(ending.time>=60);assert.ok(ending.openingFeedback.chainBest>=2);assert.deepEqual(errors,[]);
  await page.close();const video=await page.video().path();
  await writeFile(path('check.json'),JSON.stringify({method:'Real pointer controls; 390x844; 2x natural progression, no combat state edits.',records,errors,video},null,2));
  console.log(JSON.stringify({passed:true,time:ending.time,hp:ending.hp,stations:ending.stationCount,chainBest:ending.openingFeedback.chainBest,video}));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path('failure.png')});console.log(await page.evaluate(()=>__doomsday.snapshot()));}throw error;
}finally{await browser.close();}
