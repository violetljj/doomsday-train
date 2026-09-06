import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Controlled rendering fixtures, not a natural-play or balance measurement.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const output = new URL('../artifacts/combat-feedback/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const records = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:61401');
  await page.waitForFunction(() => globalThis.__doomsday?.snapshot().art.weapons.length === 10);
  await page.evaluate(async () => {
    const cc = await globalThis.System.import('cc');
    const find = node => node.components.find(component => component.model && component.weaponSound) || node.children.map(find).find(Boolean);
    globalThis.feedbackGame = find(cc.director.getScene());
    if (!globalThis.feedbackGame) throw Error('Game component missing');
  });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [name, cars] of [['coverage', ['fan', 'cannon', 'prism']], ['thermal', ['flame', 'cryo', 'tesla']], ['vortex', ['cannon', 'fan', 'tesla']]]) {
      await page.evaluate(cars => {
        const g = globalThis.feedbackGame;
        g.begin();g.entranceRemaining = 0;g.debugSpeed = 1;
        const m = g.model;m.startEncounter();m.enemies = [];
        m.openWorkshop();
        for(let i=0;i<cars.length;i++){m.pendingCar=cars[i];m.install(i);}
        // Fixtures intentionally define the formation and a stationary durable pack.
        for(let i=cars.length;i<m.slots.length;i++)m.slots[i]=null;
        m.resumeWorkshop();m.nextScrap=100000;
        for(let i=0;i<18;i++)m.enemies.push({id:10000+i,x:135+i%3*22,y:35-Math.floor(i/3)*32,hp:300,maxHp:300,speed:0,kind:0,flash:0});
      }, cars);
      await page.waitForTimeout(name === 'thermal' ? 1400 : 900);
      const before = await page.evaluate(() => {
        const g=globalThis.feedbackGame;
        return { ...globalThis.__doomsday.snapshot(), cold:g.model.enemies.filter(e=>e.slow>0||e.freeze>0).length,
          sounds:Array.from(g.soundTimes.keys()), positions:g.model.enemies.map(e=>[e.x,e.y]) };
      });
      await page.screenshot({ path: decodeURIComponent(new URL(`${name}-${viewport.width}.png`, output).pathname).replace(/^\/([A-Z]:)/, '$1') });
      assert.equal(before.phase,'combat');assert.equal(before.links.length,2);
      assert.ok(before.art.activeFx>0, `${name}: missing rendered effects`);
      const canvas = await page.locator('canvas').screenshot();
      assert.ok(canvas.length>20000, `${name}: unexpectedly blank canvas`);
      if(name==='thermal')assert.ok(before.cold>0,'Cold enemies must be visible');
      if(name==='vortex')assert.ok(before.positions.some(([x],i)=>Math.abs(x-(135+i%3*22))>2),'Vortex must move enemies');
      await page.waitForTimeout(180);
      const after = await page.locator('canvas').screenshot();
      assert.ok(!canvas.equals(after),`${name}: static battle`);
      records.push({fixture:name,viewport,...before});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    const g=globalThis.feedbackGame,m=g.model;
    m.hp=74;m.shieldHp=12;m.enemies=[];m.spawnClock=-100;
  });
  await page.waitForTimeout(100);
  await page.screenshot({path:decodeURIComponent(new URL('armor-shield-390.png',output).pathname).replace(/^\/([A-Z]:)/,'$1')});
  await page.evaluate(()=>{
    const g=globalThis.feedbackGame;g.damageNumbers.clear();g.model.damageTrain(18,'boss_slam');
  });
  await page.waitForTimeout(100);
  const incoming=await page.evaluate(()=>globalThis.__doomsday.snapshot());
  assert.equal(incoming.hp,68);assert.equal(incoming.shield,0);
  assert.ok(incoming.damageNumbers.some(n=>n.shield&&n.amount===12));
  assert.ok(incoming.damageNumbers.some(n=>n.incoming&&!n.shield&&n.amount===6));
  records.push({fixture:'armor-shield-actual-loss',hp:incoming.hp,shield:incoming.shield,numbers:incoming.damageNumbers});
  await page.screenshot({path:decodeURIComponent(new URL('incoming-damage-390.png',output).pathname).replace(/^\/([A-Z]:)/,'$1')});
  await page.evaluate(()=>{const g=globalThis.feedbackGame;g.openWorkshop(0);});
  await page.waitForTimeout(100);
  await page.screenshot({path:decodeURIComponent(new URL('attack-stats-390.png',output).pathname).replace(/^\/([A-Z]:)/,'$1')});
  await page.evaluate(() => {
    const g=globalThis.feedbackGame,m=g.model;
    m.milestoneSupply=true;m.phase='supply';m.offers=[{kind:'mod',id:'scatter'},{kind:'mod',id:'burst'},{kind:'car',id:'cryo'}];m.revision++;
  });
  await page.setViewportSize({ width:390,height:844 });
  await page.waitForTimeout(100);
  await page.screenshot({path:decodeURIComponent(new URL('milestone-390.png',output).pathname).replace(/^\/([A-Z]:)/,'$1')});
  const flameGain=await page.evaluate(()=>globalThis.feedbackGame.flameBed?.gain.gain.value??0);
  assert.ok(flameGain<.003,'Flame bed should fade during supply');
  assert.deepEqual(errors,[]);
  await writeFile(new URL('receipt.json',output),JSON.stringify({kind:'controlled-render-fixtures',errors,records},null,2));
  console.log('Combat feedback: six desktop/mobile fixtures, movement, cold state, assets and pause audio passed.');
} finally { await browser.close(); }
