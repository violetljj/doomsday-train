import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { CAR_TYPES, CARS } from '../assets/scripts/Catalog.ts';
import { renderPanel } from '../assets/scripts/PanelRenderer.ts';

const m = new Combat();
m.start();
const labels = [], buttons = [];
const noop = () => {};
const context = {
  model: m, knownRecipes: new Set(), newRecipes: new Set(),
  atlas: false, atlasCars: true, atlasPage: 0, selectedSlot: 0,
  draw: { rect: noop, label: text => labels.push(text), art: noop,
    button: (text,x,y,w,h,action) => buttons.push({text,action}),
    cardIcon: noop, line: noop, circle: noop, addHitArea: noop },
  actions: { begin: noop, selectSlot: noop, setAtlas: noop, chooseOffer: noop,
    discardOffer: noop, resumeWorkshop: noop, openWorkshop: noop, resume: noop,
    backToMenu: noop, installPending: () => m.install(0), mergePending: () => m.mergePending(0) },
};
function draw() { labels.length=0;buttons.length=0;renderPanel(context); }
m.phase='supply';m.hp=88;m.offers=[{kind:'repair',id:'repair',amount:12},{kind:'car',id:'rail'},{kind:'mod',id:'burst'}];
draw();assert.ok(labels.includes('应急维修'));assert.ok(labels.includes('装甲 88 → 100'));
m.phase='workshop';m.pendingCar='cannon';
draw();assert.ok(buttons.some(b=>b.text==='插入新车'));assert.ok(buttons.some(b=>b.text==='合并升级'));
assert.equal(m.slots[0].level,0);buttons.find(b=>b.text==='合并升级').action();
assert.equal(m.slots[0].level,1);assert.equal(m.slots.filter(Boolean).length,1);assert.equal(m.pendingCar,null);
m.pendingCar='rail';draw();assert.ok(!buttons.some(b=>b.text==='合并升级'));
buttons.find(b=>b.text==='插入新车').action();assert.equal(m.slots[0].type,'rail');assert.equal(m.slots[1].level,1);
m.phase='menu';context.atlas=true;
const directory=[];
for(let page=0;page<Math.ceil(CAR_TYPES.length/3);page++){context.atlasPage=page;draw();directory.push(...labels);}
for(const type of CAR_TYPES)assert.ok(directory.includes(CARS[type].name));
context.atlasCars=false;draw();assert.ok(labels.includes('联动图鉴'));
console.log('Panel checks passed: mixed repairs, explicit merge vs insert, all ten car entries, recipe tab.');
