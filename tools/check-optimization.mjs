import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.EVIDENCE_DIR||'artifacts/optimization-20260910/browser');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],records=[],browserWarnings=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:Number(process.env.DEVICE_SCALE||1)});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error'){
    const location=msg.location().url||'';
    if(location===`${process.argv[2].replace(/\/$/,'')}/favicon.ico`)browserWarnings.push({message:msg.text(),url:location});
    else errors.push(`${msg.text()} ${location}`);
  }});
  await page.goto(process.argv[2]);
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{
    const cc=await System.import('cc');
    const find=node=>node.components.find(c=>c.model&&c.weaponSound)||node.children.map(find).find(Boolean);
    globalThis.qaGame=find(cc.director.getScene());globalThis.qaCC=cc;
  });
  await page.waitForFunction(()=>qaGame.titleFont&&qaGame.bodyFont&&qaGame.digitFrames.length===60&&qaGame.engineFrames.size===3&&qaGame.terrainFrames.size===12&&qaGame.enemyAtlasReady);
  async function capture(name){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    records.push({name,...await page.evaluate(()=>({state:__doomsday.snapshot(),fonts:[qaGame.titleFont?.name,qaGame.bodyFont?.name],digits:qaGame.digitFrames.length}))});
    await page.screenshot({path:resolve(out,`${name}.png`)});
  }
  async function click(x,y){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const p=await page.evaluate(({x,y})=>{
      const cc=qaCC,world=qaGame.node.getComponent(cc.UITransform).convertToWorldSpaceAR(new cc.Vec3(x,y,0));
      const size=cc.view.getVisibleSize(),origin=cc.view.getVisibleOrigin(),box=document.querySelector('canvas').getBoundingClientRect(),s=Math.min(box.width/size.width,box.height/size.height);
      return{x:box.x+(box.width-size.width*s)/2+(world.x-origin.x)*s,y:box.y+(box.height+size.height*s)/2-(world.y-origin.y)*s};
    },{x,y});await page.mouse.click(p.x,p.y);
  }
  await capture('menu-390');
  await click(-145,-475);await page.waitForFunction(()=>__doomsday.snapshot().garageOpen);await capture('garage-dawn-390');
  await click(0,174);await page.waitForFunction(()=>__doomsday.snapshot().garage.loadout.engine==='storm');await capture('garage-storm-390');
  await click(194,174);await page.waitForFunction(()=>__doomsday.snapshot().garage.loadout.engine==='haven');await capture('garage-haven-390');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('doomsday-garage-v1')).loadout.engine),'haven');
  await page.reload();
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{
    const cc=await System.import('cc');const find=node=>node.components.find(c=>c.model&&c.weaponSound)||node.children.map(find).find(Boolean);
    globalThis.qaGame=find(cc.director.getScene());globalThis.qaCC=cc;
  });
  assert.equal(await page.evaluate(()=>__doomsday.snapshot().garage.loadout.engine),'haven');
  await click(-145,-475);await page.waitForFunction(()=>__doomsday.snapshot().garageOpen);
  await click(-194,174);await page.waitForFunction(()=>__doomsday.snapshot().garage.loadout.engine==='dawn');
  await click(0,-392);await page.waitForFunction(()=>!__doomsday.snapshot().garageOpen);
  await click(0,-351);await page.waitForFunction(()=>__doomsday.snapshot().phase==='combat');
  await click(0,-577);assert.equal((await page.evaluate(()=>__doomsday.snapshot())).speed,2);
  await click(288,-577);await page.waitForFunction(()=>__doomsday.snapshot().phase==='paused');await capture('pause-390');
  const paused=await page.evaluate(()=>__doomsday.snapshot().time);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>__doomsday.snapshot().time),paused);
  await click(0,-151);await page.waitForFunction(()=>__doomsday.snapshot().phase==='workshop');await capture('arrange-390');
  for(let region=0;region<(process.env.SKIP_REGIONS?1:12);region++){
    await page.evaluate(region=>{
      const g=qaGame;g.begin();g.entranceRemaining=0;g.debugSpeed=1;
      const m=g.model;m.startEncounter();m.time=region*60+2;m.nextScrap=100000;m.hp=10000;m.spawnClock=-100;
      m.enemies=[];for(let kind=0;kind<9;kind++)m.enemies.push({id:90000+kind,x:kind%2?160:-160,y:40-Math.floor(kind/2)*85,hp:10000,maxHp:10000,speed:0,kind,flash:0});
    },region);
    await page.waitForTimeout(120);await capture(`region-${region+1}-390`);
  }
  // Controlled render fixtures below are explicitly separate from the natural opening check.
  for(const [name,cars]of [['chain',['cannon','fan','tesla','cryo','rail']],['fire',['cannon','rail','flame','tesla','acid']],['support',['cannon','fan','repair','shield','tesla']]]){
    await page.evaluate(cars=>{
      const g=qaGame;g.begin();g.entranceRemaining=0;g.debugSpeed=2;
      const m=g.model;m.startEncounter();m.openWorkshop();m.slots.fill(null);
      for(let i=0;i<cars.length;i++){m.pendingCar=cars[i];if(!m.install(i))throw Error('fixture install');}
      for(let j=0;j<3;j++){m.pendingCar=cars[0];if(!m.mergePending(0))throw Error('fixture merge');}
      m.time=65;m.kills=180;m.linkActivationCount=60;m.seenRecipes=new Set(m.links.map(l=>l.recipe.id));
      m.nextScrap=100000;m.hp=100;m.spawnClock=-1000;m.resumeWorkshop();
      // Durable pack makes real attack numerals visible without an endless screenshot loop.
      m.enemies=[];for(let i=0;i<18;i++)m.enemies.push({id:50000+i,x:(i%2?1:-1)*(130+(i%3)*32),y:30-Math.floor(i/2)*43,hp:1500,maxHp:1500,speed:2,kind:0,flash:0});
    },cars);
    await page.waitForFunction(()=>qaGame.model.buildPower.overdrive.active,null,{timeout:15000});
    await capture(`${name}-overdrive-390`);
    assert.equal(await page.evaluate(()=>qaGame.model.buildPower.tier),3);
    const before=await page.evaluate(()=>({time:qaGame.model.time,remaining:qaGame.model.buildPower.overdrive.remaining}));
    assert.ok(before.remaining>0);
    if(name==='fire'){
      await page.evaluate(()=>qaGame.model.pause());
      const frozen=await page.evaluate(()=>qaGame.model.buildPower.overdrive.remaining);await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>qaGame.model.buildPower.overdrive.remaining),frozen);
      await page.evaluate(()=>qaGame.model.resume());
    }
  }
  // Reproducible timing study for numerals, not fabricated combat damage evidence.
  await page.evaluate(()=>{
    const g=qaGame;g.model.enemies=[];g.model.spawnClock=-100;g.model.projectiles=[];g.model.vortices=[];g.model.effects=[];
    g.damageNumbers.clear();g.model.openWorkshop(); // freezes simulation but the next fixture draws only combat HUD
    g.model.phase='combat';g.debugSpeed=1;
    g.damageNumbers.add('fixture:normal',-200,-70,26,'#F5D6A6',false,false,'normal');
    g.damageNumbers.add('fixture:heavy',170,-120,142,'#FFD8A2',false,false,'heavy');
    g.damageNumbers.add('fixture:tick',-180,-230,3.5,'#F1BB91',false,false,'tick');
    g.damageNumbers.add('fixture:shield',170,-270,18,'#ABDDEA',false,true,'shield');
    g.damageNumbers.add('fixture:incoming',0,-320,12,'#F3A18E',true,false,'incoming');
  });
  await page.waitForTimeout(85);await capture('damage-impact-390');
  await page.waitForTimeout(180);await capture('damage-settle-390');
  await page.screenshot({path:resolve(out,'damage-detail-390.png'),clip:{x:0,y:260,width:390,height:350}});
  await page.waitForTimeout(250);await capture('damage-fade-390');
  await page.evaluate(()=>{qaGame.lowMotion=true;qaGame.model.hp=0;qaGame.model.phase='lose';qaGame.model.endReason='armor';qaGame.model.mainDamageSource='重甲敌人撞击';});
  await capture('results-390');
  await click(0,-320);await page.waitForFunction(()=>__doomsday.snapshot().phase==='combat');
  assert.equal(await page.evaluate(()=>qaGame.model.buildPower.overdrive.active),false);
  assert.equal(await page.evaluate(()=>qaGame.model.slots.filter(Boolean).length),1);
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>{qaGame.model.phase='menu';qaGame.state='';});await page.waitForTimeout(100);await capture('menu-desktop');
  assert.deepEqual(errors,[]);
  await writeFile(resolve(out,'checks.json'),JSON.stringify({method:'Real pointer pause/workshop/restart and garage reload; explicit controlled mature-build and damage presentation fixtures. Natural opening separately recorded.',errors,browserWarnings,records},null,2));
  console.log(JSON.stringify({passed:true,captures:records.length,errors}));
}finally{await browser.close();}
