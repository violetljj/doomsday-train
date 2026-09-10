// Controlled, fixed-age presentation capture; does not claim natural combat progression.
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 await page.goto(process.argv[2]);
 await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
 await page.evaluate(async()=>{
  const cc=await System.import('cc'),find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);
  globalThis.g=find(cc.director.getScene());
 });
 await page.waitForFunction(()=>g.digitFrames.length===60&&g.titleFont&&g.terrainFrames.size===12);
 await page.evaluate(()=>{
  g.begin();g.entranceRemaining=0;g.debugSpeed=1;const m=g.model;
  m.startEncounter();m.openWorkshop();m.slots.fill(null);
  ['cannon','fan','tesla','cryo','rail'].forEach((car,i)=>{m.pendingCar=car;m.install(i);});
  m.resumeWorkshop();m.time=23;m.enemies=[];m.spawnClock=-1000;m.nextScrap=100;
  g.damageNumbers.clear();
  [['normal',-200,-70,26,false,false],['heavy',170,-120,142,false,false],['tick',-180,-230,3.5,false,false],['shield',170,-270,18,false,true],['incoming',0,-320,12,true,false]].forEach(([kind,x,y,value,incoming,shield])=>g.damageNumbers.add('fixture:'+kind,x,y,value,'#FFFFFF',incoming,shield,kind));
  for(const n of g.damageNumbers.items){n.age=.22;n.life=n.duration-.22;}
  g.damageNumbers.advance=()=>{};
 });
 await page.waitForTimeout(150);
 await page.screenshot({path:'artifacts/optimization-20260910/wake-v6-final/damage-detail-390.png',clip:{x:0,y:260,width:390,height:350}});
 await page.screenshot({path:'artifacts/optimization-20260910/wake-v6-final/damage-fixed-age-390.png'});
 console.log('Five scenarios captured at fixed 220ms age, using current runtime glyphs and layout.');
} finally {await browser.close();}
