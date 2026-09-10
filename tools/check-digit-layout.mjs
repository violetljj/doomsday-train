// Runs against the built Cocos bundle, so string-spread transpilation regressions are covered.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  await page.goto(process.argv[2]);
  await page.waitForFunction(()=>globalThis.__doomsday?.snapshot().art.weapons.length===10);
  await page.evaluate(async()=>{
    const cc=await System.import('cc');
    const find=n=>n.components.find(c=>c.model&&c.weaponSound)||n.children.map(find).find(Boolean);
    globalThis.g=find(cc.director.getScene());globalThis.cc=cc;
  });
  await page.waitForFunction(()=>g.digitFrames.length===60);
  const data=await page.evaluate(()=>{
    g.begin();g.entranceRemaining=0;g.model.startEncounter();g.model.spawnClock=-100;
    g.model.enemies=[];g.lowMotion=true;g.damageNumbers.clear();
    for(let i=0;i<6;i++)g.damageNumbers.add('dense'+i,-180,-240,43,'#FFFFFF',false,false,'heavy');
    g.damageNumbers.add('incoming',150,-250,12,'#FFFFFF',true,false,'incoming');
    g.damageNumbers.add('tick',150,-150,3.5,'#FFFFFF',false,false,'tick');
    cc.director.pause();
    const original=Array.prototype.push,rects=[];
    // Observe the renderer's reserved rectangles without adding test state to production.
    try {
      Array.prototype.push=function(...args){
        if(args[0]&&Object.keys(args[0]).join(',')==='x,y,w,h')original.call(rects,args[0]);
        return original.apply(this,args);
      };
      g.drawGround();g.drawWorld();g.drawEffects();g.drawHUD();
    } finally {Array.prototype.push=original;}
    return {rects,glyphs:g.digitSprites.filter(n=>n.active).map(n=>({
      x:n.position.x,y:n.position.y,w:n.getComponent(cc.UITransform).width,
      h:n.getComponent(cc.UITransform).height,rect:n.getComponent(cc.Sprite).spriteFrame.rect,
    }))};
  });
  assert.equal(data.rects.length,6,'Incoming, four heavy groups and tick fit the controlled field');
  let offset=0;
  for(const [i,count] of [3,2,2,2,2,3].entries()) {
    const box=data.rects[i],glyphs=data.glyphs.slice(offset,offset+count);offset+=count;
    const left=Math.min(...glyphs.map(n=>n.x-n.w/2)),right=Math.max(...glyphs.map(n=>n.x+n.w/2));
    assert.ok(left>=box.x-box.w/2-.01&&right<=box.x+box.w/2+.01,
      `Group ${i}: every glyph, including signs and decimals, must fit its reserved width`);
    for(const other of data.rects.slice(0,i))assert.ok(
      Math.abs(box.x-other.x)>=(box.w+other.w)/2||Math.abs(box.y-other.y)>=(box.h+other.h)/2,
      'Reserved float rectangles must not overlap');
  }
  assert.equal(offset,data.glyphs.length);
  await writeFile('artifacts/optimization-20260910/wake-v6/layout.json',JSON.stringify({passed:true,...data},null,2));
  console.log('Built renderer passed: 14 glyphs in 6 complete, non-overlapping groups, including -12 and 3.5.');
} finally {await browser.close();}
