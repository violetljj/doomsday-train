import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { CAR_TYPES, CARS, RECIPES } from '../assets/scripts/Catalog.ts';
import { renderPanel } from '../assets/scripts/PanelRenderer.ts';

const m = new Combat();
m.start();
const labels = [], buttons = [], hits = [], icons = [], textBoxes = [];
const noop = () => {};
const context = {
  model: m, knownRecipes: new Set(), newRecipes: new Set(),
  atlas: false, atlasCars: true, atlasPage: 0, selectedSlot: 0,
  draw: { rect: noop, label: (text,x,y,size,color,width) => {labels.push(text);textBoxes.push({text,x,y,size,width});}, art: noop,
    button: (text,x,y,w,h,action,accent=true) => buttons.push({text,x,y,w,h,action,accent}),
    cardIcon: type => icons.push(type), line: noop, circle: noop,
    addHitArea: (x,y,w,h,action) => hits.push({x,y,action}) },
  actions: { begin: noop, selectSlot: noop, setAtlas: noop, chooseOffer: noop,
    discardOffer: noop, resumeWorkshop: noop, openWorkshop: noop, resume: noop,
    backToMenu: noop, installPending: depart => { if(m.install(context.selectedSlot) && depart)m.resumeWorkshop(); },
    manualPlacement: () => {context.selectedSlot=-1;context.replacementConfirmed=false;},
    cancelReplacement: () => {context.replacementConfirmed=false;},
    confirmReplacement: () => {context.replacementConfirmed=true;}, mergePending: () => m.mergePending(0) },
};
function draw() { labels.length=0;buttons.length=0;hits.length=0;icons.length=0;textBoxes.length=0;renderPanel(context); }
m.phase='supply';m.rewardState={kind:'mod',source:'timer',title:'定时整备'};
m.offers=[{kind:'mod',id:'burst'},{kind:'mod',id:'rapid'},{kind:'mod',id:'scatter'}];
draw();assert.ok(labels.includes('特殊改装'));assert.ok(labels.includes('定时整备 · 改装三选一'));
assert.ok(labels.some(text=>text.startsWith('作用于现有')));
assert.ok(labels.includes('选一项立即生效 · 强化现有编组'));
m.phase='workshop';m.pendingCar='cannon';
draw();assert.ok(buttons.some(b=>b.text==='插入并出发'));assert.ok(buttons.some(b=>b.text==='合并升级'));
assert.equal(m.slots[0].level,0);buttons.find(b=>b.text==='合并升级').action();
assert.equal(m.slots[0].level,1);assert.equal(m.slots.filter(Boolean).length,1);assert.equal(m.pendingCar,null);
m.pendingCar='rail';draw();assert.ok(!buttons.some(b=>b.text==='合并升级'));
buttons.find(b=>b.text==='插入并出发').action();assert.equal(m.slots[0].type,'rail');assert.equal(m.slots[1].level,1);assert.equal(m.phase,'combat');
m.openWorkshop();m.pendingCar='fan';context.selectedSlot=2;draw();
assert.ok(labels.includes('未知联动'));assert.ok(icons.includes('fan')&&icons.includes('cannon'));
assert.ok(!labels.some(text=>text.startsWith('标称')||text.includes('目标槽位')||text.includes('可替换')));
for(const recipe of RECIPES)assert.ok(!labels.some(text=>text.includes(recipe.name)),`Leaked ${recipe.name}`);
context.knownRecipes.add('cannon-fan');draw();assert.ok(labels.some(text=>text.includes('风压贯穿炮')));
hits.find(hit=>hit.x===-146&&hit.y===-383).action();draw();assert.equal(context.selectedSlot,-1);assert.ok(!buttons.some(b=>b.text==='装车并出发'));
context.selectedSlot=2;draw();buttons.find(b=>b.text==='装车并出发').action();assert.equal(m.phase,'combat');
m.openWorkshop();for(const slot of [3,4]){m.pendingCar='shield';m.install(slot);}
m.pendingCar='cryo';context.selectedSlot=1;m.slots[1].mods.rapid=1;draw();
assert.ok(labels.some(text=>text.includes('项改装')));assert.ok(!labels.includes('自动供弹'));
const original=m.slots[1];buttons.find(b=>b.text==='替换旧车').action();assert.equal(m.slots[1],original);assert.equal(m.pendingCar,'cryo');
draw();assert.ok(labels.includes('自动供弹'));assert.ok(!buttons.some(b=>b.text==='替换旧车'));
hits.find(hit=>hit.x===0&&hit.y===-383).action();draw();assert.equal(context.replacementConfirmed,false);assert.equal(m.slots[1],original);
buttons.find(b=>b.text==='替换旧车').action();draw();buttons.find(b=>b.text==='确认替换并出发').action();assert.equal(m.slots[1].type,'cryo');assert.equal(m.phase,'combat');
m.phase='menu';context.atlas=true;
const directory=[];
for(let page=0;page<Math.ceil(CAR_TYPES.length/3);page++){context.atlasPage=page;draw();directory.push(...labels);}
for(const type of CAR_TYPES)assert.ok(directory.includes(CARS[type].name));
context.atlasCars=false;draw();assert.ok(labels.includes('联动图鉴'));
m.phase='supply';context.atlas=false;m.rewardState={kind:'car',source:'xp',title:'经验补给'};m.hp=25;
m.offers=[{kind:'car',id:'rail'},{kind:'car',id:'cannon'},{kind:'car',id:'fan'}];
draw();assert.equal(labels.filter(text=>text==='建议').length,1);
assert.ok(labels.includes('编组晋升'));
assert.ok(labels.includes('经验积累 · 车厢三选一'));
assert.ok(labels.includes('列车已满 · 选车后在工坊合并或替换'));
assert.ok(!labels.some(text=>text.includes('追加')||text.includes('三选一 · 同车合并 / 改装')),'car rewards never advertise retired mixed station rules');
assert.equal(hits.length,3,'all offers remain equally selectable');
assert.ok(textBoxes.filter(box=>box.x===-111).every(box=>box.size>=20),'decision copy is readable at the mobile scale');
assert.ok(labels.some(text=>text.startsWith('下一步 · ')));
m.rewardState={kind:'mod',source:'elite',title:'精英战利'};
m.offers=[{kind:'mod',id:'rapid'},{kind:'mod',id:'burst'},{kind:'mod',id:'scatter'}];draw();
assert.ok(labels.includes('精英战利 · 改装三选一'));
assert.ok(!labels.some(text=>text.includes('进入工坊')||text.includes('空槽')),'modifier rewards apply directly to existing cars');
m.phase='paused';m.previous='combat';m.time=95;draw();
assert.ok(labels.includes('暂时停靠'));
assert.ok(labels.includes('01:35'));
assert.ok(labels.includes(`装甲 ${Math.ceil(m.hp)} / ${m.maxHp}`));
assert.ok(icons.length===m.slots.filter(Boolean).length,'pause shows the current formation');
assert.equal(buttons.filter(button=>button.accent).length,1,'resume is the only primary pause action');
assert.equal(buttons.find(button=>button.text==='继续前进  →').action,context.actions.resume);
assert.equal(buttons.find(button=>button.text==='调整车序  ↔').action,context.actions.openWorkshop);
m.previous='supply';draw();
assert.equal(buttons.find(button=>button.text==='返回补给  →').action,context.actions.resume);
assert.ok(!buttons.some(button=>button.action===context.actions.openWorkshop&&button.text.includes('车序')),'pending supply cannot be bypassed via workshop');
m.phase='lose';m.time=95;m.kills=74;m.mainDamageSource='重甲怪';draw();
assert.ok(labels.includes('下局试试'));
assert.ok(labels.some(text=>text.includes('联动发动')));
assert.ok(!labels.some(text=>text.includes('成长评分')||text.includes('DPS')),'recap reports observable outcomes rather than a synthetic power score');
assert.ok(buttons.every(button=>button.y-button.h/2>=-425),'result actions fit inside the painted panel');
m.start();m.openWorkshop();m.pendingCar='cryo';m.install(0);m.pendingCar='acid';m.install(2);
m.phase='workshop';context.selectedSlot=1;draw();
assert.ok(labels.includes(m.getCarSynergySummary(1))&&m.getCarSynergySummary(1).includes('冻结与腐蚀'),'selected weapon exposes its actual double-sided payload');
const synergyBox=textBoxes.find(box=>box.text===m.getCarSynergySummary(1));
assert.equal(synergyBox.y,-29,'synergy uses the existing detail row without pushing into the link list');
console.log('Panel checks passed: separated car/mod reward sources, explicit merge vs insert, all ten car entries, recipe tab.');

context.historyOpen=true;context.garage={version:1,loadout:{engine:'dawn',module:'none'},records:{runs:0,bestTime:0,bestWave:0,totalKills:0,bossKills:0,recipes:[]},recentRuns:[]};
draw();assert.ok(labels.includes('还没有远征记录'));
context.garage.recentRuns=Array.from({length:5},(_,i)=>({number:5-i,time:90+i,wave:5,kills:90,bosses:1,engine:'storm',outcome:'defeat',cars:[{type:'cannon',level:2},null,{type:'fan',level:1},null,null]}));
draw();assert.equal(icons.filter(x=>x==='cannon').length,5);assert.ok(labels.includes('#5 鸣雷号 · 01:30 · 第5波'));assert.equal(labels.filter(x=>x==='失守').length,5);
assert.ok(buttons.some(b=>b.text==='返回'));console.log('Expedition history panel: empty and five-entry views passed.');

context.historyOpen=false;m.phase='paused';m.previous='combat';let retired=false;context.actions.backToMenu=()=>{retired=true;};draw();
buttons.find(b=>b.text==='收车并记录').action();assert.ok(retired);console.log('Pause offers explicit retirement to the menu.');

context.historyOpen=true;context.saveFailed=true;let retried=false;context.actions.retrySave=()=>{retried=true;};draw();
assert.ok(labels.includes('记录暂未写入设备 · 请勿关闭页面'));buttons.find(b=>b.text==='重试保存').action();assert.ok(retried);
context.saveFailed=false;draw();assert.ok(!buttons.some(b=>b.text==='重试保存'));console.log('History save warning and retry controls passed.');

context.historyOpen=false;context.saveFailed=true;m.phase='lose';retried=false;draw();
assert.ok(labels.includes('记录未存盘 · 点此重试，请勿关闭页面'));hits.find(h=>h.y===272).action();assert.ok(retried);

context.historyOpen=true;context.saveFailed=false;context.historyIndex=-1;
context.actions.selectHistory=index=>{context.historyIndex=index;};
context.garage.recentRuns[0].cars[0].mods={rapid:2,scatter:1,burst:2};
draw();hits[0].action();draw();
assert.ok(labels.includes('第5次远征'));
assert.ok(labels.includes('自动供弹 2级 · 霰射弹仓 1级'));
assert.ok(labels.includes('序列连发 2级'));
assert.ok(labels.includes('旧记录未保存词条'));
assert.equal(labels.filter(text=>text==='空车位').length,3);
buttons.find(b=>b.text==='返回记录列表').action();draw();
assert.ok(labels.includes('远征记录'));assert.equal(context.historyIndex,-1);
console.log('History details: open, modifiers, legacy gaps and return passed.');
