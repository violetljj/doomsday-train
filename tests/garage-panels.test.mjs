import assert from 'node:assert/strict';
import { Combat } from '../assets/scripts/Combat.ts';
import { renderPanel } from '../assets/scripts/PanelRenderer.ts';
import { ENGINES, MODULES } from '../assets/scripts/Locomotives.ts';
import { newGarage } from '../assets/scripts/Garage.ts';

const model = new Combat(), garage = newGarage();
const labels = [], hits = [], buttons = [], engineIcons = [];
const noop = () => {};
let departures=0, closes=0, opens=0;
const context = {
  model, garage, garageOpen:true, knownRecipes:new Set(), newRecipes:new Set(),
  atlas:false, atlasCars:true, atlasPage:0, selectedSlot:-1,
  draw:{
    rect:noop, art:noop, line:noop, circle:noop, cardIcon:noop,
    label:(text,x,y,size,color,width)=>labels.push({text,x,y,size,width}),
    engineIcon:(id,x,y,size)=>engineIcons.push({id,x,y,size}),
    addHitArea:(x,y,w,h,action)=>hits.push({x,y,w,h,action}),
    button:(text,x,y,w,h,action)=>buttons.push({text,x,y,w,h,action}),
  },
  actions:{
    begin:()=>departures++,selectSlot:noop,setAtlas:noop,installPending:noop,mergePending:noop,
    chooseOffer:noop,discardOffer:noop,resumeWorkshop:noop,openWorkshop:noop,resume:noop,backToMenu:noop,
    openGarage:()=>opens++,closeGarage:()=>closes++,
    chooseEngine:id=>{garage.loadout.engine=id;},chooseModule:id=>{garage.loadout.module=id;},
  },
};
function draw(){labels.length=0;hits.length=0;buttons.length=0;engineIcons.length=0;renderPanel(context);}
draw();
assert.deepEqual(engineIcons.map(icon=>icon.id),['dawn','storm','haven']);
assert.equal(hits.filter(hit=>hit.y===172).length,3,'all engines are usable on a new save');
assert.equal(hits.filter(hit=>hit.y===-81).length,2,'standard and plating modules start unlocked');
assert.equal(hits.filter(hit=>hit.y===-142).length,0,'locked modules cannot invoke selection');
assert.ok(labels.some(label=>label.text.includes('发现配方 0/3')));
assert.ok(labels.some(label=>label.text.includes('击破首领 0/1')));
hits.find(hit=>hit.x===0&&hit.y===172).action();draw();
assert.equal(garage.loadout.engine,'storm');
assert.ok(labels.some(label=>label.text.includes(ENGINES.storm.skillName)));
assert.ok(labels.some(label=>label.text===ENGINES.storm.skillSummary),'selected engine explains its real periodic skill');
assert.ok(buttons.some(button=>button.text.includes(ENGINES.storm.name)));
hits.find(hit=>hit.x===146&&hit.y===-81).action();draw();
assert.equal(garage.loadout.module,'plating');
assert.ok(labels.some(label=>label.text===MODULES.plating.description));
garage.records.recipes=['cannon-fan','cannon-cryo','tesla-fan'];garage.records.bossKills=1;
draw();assert.equal(hits.filter(hit=>hit.y===-142).length,2,'earned modules become selectable');
hits.find(hit=>hit.x===146&&hit.y===-142).action();
assert.equal(garage.loadout.module,'capacitor');
draw();const snapshot=JSON.stringify(garage);draw();assert.equal(JSON.stringify(garage),snapshot,'rendering never writes persistence');
buttons.find(button=>button.y===-320).action();assert.equal(departures,1);
buttons.find(button=>button.text==='返回').action();assert.equal(closes,1);
assert.ok([...buttons,...hits].every(hit=>hit.x-hit.w/2>=-320&&hit.x+hit.w/2<=320&&hit.y-hit.h/2>=-425&&hit.y+hit.h/2<=415),'garage controls fit the established mobile panel');
assert.ok(labels.filter(label=>label.x===-276).every(label=>label.size>=20),'main decisions preserve readable body type');
context.garageOpen=false;draw();
buttons.find(button=>button.text==='整备车头').action();assert.equal(opens,1);
assert.ok(labels.some(label=>label.text.includes(ENGINES.storm.name)),'menu reflects the saved engine');
console.log('Garage panel checks passed: engine selection, locked modules, earned unlocks, persistence purity and mobile control bounds.');
