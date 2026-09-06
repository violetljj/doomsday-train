import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { CAR_TYPES, CARS, RECIPES } from '../assets/scripts/Catalog.ts';
import { renderPanel } from '../assets/scripts/PanelRenderer.ts';

const m = new Combat();
m.start();
const labels = [], buttons = [], hits = [], icons = [];
const noop = () => {};
const context = {
  model: m, knownRecipes: new Set(), newRecipes: new Set(),
  atlas: false, atlasCars: true, atlasPage: 0, selectedSlot: 0,
  draw: { rect: noop, label: text => labels.push(text), art: noop,
    button: (text,x,y,w,h,action) => buttons.push({text,action}),
    cardIcon: type => icons.push(type), line: noop, circle: noop,
    addHitArea: (x,y,w,h,action) => hits.push({x,y,action}) },
  actions: { begin: noop, selectSlot: noop, setAtlas: noop, chooseOffer: noop,
    discardOffer: noop, resumeWorkshop: noop, openWorkshop: noop, resume: noop,
    backToMenu: noop, installPending: depart => { if(m.install(context.selectedSlot) && depart)m.resumeWorkshop(); },
    manualPlacement: () => {context.selectedSlot=-1;context.replacementConfirmed=false;},
    cancelReplacement: () => {context.replacementConfirmed=false;},
    confirmReplacement: () => {context.replacementConfirmed=true;}, mergePending: () => m.mergePending(0) },
};
function draw() { labels.length=0;buttons.length=0;hits.length=0;icons.length=0;renderPanel(context); }
m.phase='supply';m.hp=88;m.offers=[{kind:'repair',id:'repair',amount:12},{kind:'car',id:'rail'},{kind:'mod',id:'burst'}];
draw();assert.ok(labels.includes('应急维修'));assert.ok(labels.includes('装甲88→100'));
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
console.log('Panel checks passed: mixed repairs, explicit merge vs insert, all ten car entries, recipe tab.');
