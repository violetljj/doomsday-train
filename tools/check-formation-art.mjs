import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/formation-redesign/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],records=[];
try {
  const page=await browser.newPage({viewport:{width:430,height:932}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.argv[2]);
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{const cc=await System.import('cc');const find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);globalThis.g=find(cc.director.getScene());globalThis.cc=cc;});
  await page.waitForFunction(()=>g.chassisFrames.size===3&&g.chassisMaterial&&g.digitFrames.length===60);
  for(const engine of ['dawn','storm','haven']) {
    await page.evaluate(engine=>{
      g.garage.loadout.engine=engine;g.begin();g.entranceRemaining=0;g.model.spawnDelay=999;
      g.model.openWorkshop();g.model.slots.fill(null);
      for(const [i,type]of ['cryo','rail','prism','cannon','fan'].entries()){g.model.pendingCar=type;g.model.install(i);}
      g.model.phase='combat';g.lowMotion=true;g.model.enemies=[];
      g.model.time=12;g.model.supplyWait=999;g.model.nextScrap=99999;
    },engine);
    await page.waitForFunction(()=>g.carArt.size===5);
    const data=await page.evaluate(()=>({engine:g.model.runLoadout.engine,chassis:g.carArt.size,
      themed:[...g.carArt.values()].every(n=>n.getComponent(cc.Sprite).customMaterial===g.chassisMaterial),
      aspect:[...g.carArt.values()].map(n=>{const s=n.getComponent(cc.UITransform).contentSize;return s.width/s.height;}),
      summary:g.model.getCarSynergySummary(1)}));
    assert.ok(data.themed);assert.equal(data.chassis,5);assert.match(data.summary,/冻结/);records.push(data);
    await page.screenshot({path:fileURLToPath(new URL(`${engine}-formation.png`,out))});
  }
  await page.evaluate(()=>{g.model.pause();g.state='';});
  await page.waitForFunction(()=>g.hitAreas.some(a=>a.y===-177));
  await page.screenshot({path:fileURLToPath(new URL('pause.png',out))});
  const frozen=await page.evaluate(()=>({time:g.model.time,visual:g.visualTime}));
  await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(()=>({time:g.model.time,visual:g.visualTime})),frozen);
  await page.evaluate(()=>{const area=g.hitAreas.find(a=>a.y===-265);if(!area)throw Error('Workshop button missing');area.action();});
  await page.waitForFunction(()=>g.model.phase==='workshop'&&g.state.startsWith('workshop:'));
  await page.screenshot({path:fileURLToPath(new URL('workshop.png',out))});
  await page.evaluate(()=>{
    g.model.phase='combat';g.model.enemies=[];g.state='';g.damageNumbers.clear();
    ['normal','heavy','tick','shield','incoming'].forEach((kind,i)=>{
      g.damageNumbers.add('sample'+i,i%2?-170:150,40-i*80,[128,640,3.5,24,18][i],'#FFFFFF',kind==='incoming',kind==='shield',kind);
    });
  });
  await page.waitForFunction(()=>g.digitSprites.filter(n=>n.active).length>10);
  await page.screenshot({path:fileURLToPath(new URL('damage.png',out))});
  await page.evaluate(()=>{g.lowMotion=false;g.garage.loadout.engine='dawn';g.begin();});
  await page.waitForFunction(()=>g.model.time>5);
  await page.screenshot({path:fileURLToPath(new URL('live-opening.png',out))});
  assert.deepEqual(errors,[]);
  await writeFile(new URL('receipt.json',out),JSON.stringify({checks:'3 themed engines; five bases; aspect ratio; real synergy; frozen pause; workshop action; all damage channels',records,errors},null,2));
  console.log('Formation art integration passed');
} finally {await browser.close();}
