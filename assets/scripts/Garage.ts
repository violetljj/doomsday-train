import { RECIPES, CAR_TYPES, MODS } from './Catalog.ts';
import { normalizeLoadout } from './Locomotives.ts';
import type { EngineId, ModuleId, RunLoadout } from './Locomotives.ts';

import type { CarType, ModId } from './Catalog.ts';
export interface ExpeditionCar { type:CarType; level:number; mods?:Partial<Record<ModId,number>> }
export interface ExpeditionRecord {
  number:number; time:number; wave:number; kills:number; bosses:number; engine:EngineId;
  outcome:'defeat'|'retired'|'completed'; cars:(ExpeditionCar|null)[];
}
export interface GarageState {
  version: 1;
  recentRuns: ExpeditionRecord[];
  loadout: RunLoadout;
  records: { runs:number; bestTime:number; bestWave:number; totalKills:number; bossKills:number; recipes:string[] };
}
export interface RunReceipt { time:number; wave:number; kills:number; bosses:number; recipes:readonly string[]; engine?:EngineId; outcome?:ExpeditionRecord['outcome']; cars?:(ExpeditionCar|null)[] }
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
const recipeIds=new Set(RECIPES.map(recipe=>recipe.id));
/** Keep a detached, validated snapshot; old records cannot reconstruct lost modifiers. */
function snapshotCar(car:any):ExpeditionCar|null {
  if(!car||!CAR_TYPES.includes(car.type))return null;
  const result:ExpeditionCar={type:car.type,level:Math.min(99,count(car.level))};
  if(car.mods&&typeof car.mods==='object'&&!Array.isArray(car.mods)){
    result.mods={};
    for(const id of Object.keys(MODS) as ModId[]){
      const mod=MODS[id], value=count(car.mods[id]);
      if(mod.target===car.type&&value>0)result.mods[id]=Math.min(mod.mode?2:99,value);
    }
  }
  return result;
}

export function newGarage():GarageState {
  return {version:1,recentRuns:[],loadout:{engine:'dawn',module:'none'},records:{runs:0,bestTime:0,bestWave:0,totalKills:0,bossKills:0,recipes:[]}};
}
/** Defensive parsing keeps a broken old browser save from preventing departure. */
export function readGarage(raw:string|null,knownRecipes:readonly string[]=[]):GarageState {
  const state=newGarage();
  try{
    const parsed=raw?JSON.parse(raw):null;
    if(parsed?.version===1){
      state.loadout=normalizeLoadout(parsed.loadout);
      for(const key of ['runs','bestTime','bestWave','totalKills','bossKills'] as const)state.records[key]=count(parsed.records?.[key]);
      if(Array.isArray(parsed.records?.recipes))state.records.recipes=parsed.records.recipes.filter((id:unknown)=>typeof id==='string'&&recipeIds.has(id));
    }
  }catch{}
  try {
    const parsed=raw?JSON.parse(raw):null;
    if(parsed?.version===1&&Array.isArray(parsed.recentRuns))state.recentRuns=parsed.recentRuns.filter((r:any)=>r&&typeof r==='object'&&count(r.number)>0&&typeof r.time==='number'&&Number.isFinite(r.time)&&r.time>=0).slice(0,5).map((r:any)=>({
      number:count(r.number),time:count(r.time),wave:count(r.wave),kills:count(r.kills),bosses:count(r.bosses),
      engine:normalizeLoadout({engine:r.engine,module:'none'}).engine,
      outcome:r.outcome==='defeat'?'defeat':r.outcome==='completed'?'completed':'retired',
      cars:Array.from({length:5},(_,i)=>{return snapshotCar(Array.isArray(r.cars)?r.cars[i]:null);})
    }));
  }catch{}
  state.records.recipes=Array.from(new Set([...state.records.recipes,...knownRecipes.filter(id=>recipeIds.has(id))]));
  if(!moduleUnlocked(state,state.loadout.module))state.loadout.module='none';
  return state;
}
export function moduleUnlocked(state:GarageState,id:ModuleId):boolean {
  return id==='none'||id==='plating'||id==='salvager'&&state.records.recipes.length>=3||id==='capacitor'&&state.records.bossKills>=1;
}
export function moduleUnlockHint(state:GarageState,id:ModuleId):string {
  if(moduleUnlocked(state,id))return '已解锁';
  return id==='salvager'?`发现配方 ${Math.min(3,state.records.recipes.length)}/3`:'击破首领 0/1';
}
/** Call exactly once for an ended run; discovery progress can also be saved while alive. */
export function recordRun(state:GarageState,run:RunReceipt):GarageState {
  const next=readGarage(JSON.stringify(state),run.recipes);
  next.records.runs++;
  next.records.bestTime=Math.max(next.records.bestTime,count(run.time));
  next.records.bestWave=Math.max(next.records.bestWave,count(run.wave));
  next.records.totalKills+=count(run.kills);next.records.bossKills+=count(run.bosses);
  next.recentRuns=[{number:next.records.runs,time:count(run.time),wave:count(run.wave),kills:count(run.kills),bosses:count(run.bosses),
    engine:normalizeLoadout({engine:run.engine||state.loadout.engine,module:'none'}).engine,outcome:run.outcome||'retired',
    cars:Array.from({length:5},(_,i)=>{return snapshotCar(run.cars?.[i]);})},...next.recentRuns].slice(0,5);
  return readGarage(JSON.stringify(next));
}
export function selectGarageLoadout(state:GarageState,input:RunLoadout):GarageState {
  const loadout=normalizeLoadout(input);
  if(!moduleUnlocked(state,loadout.module))loadout.module=state.loadout.module;
  return {...state,loadout};
}

/** A failed device write must not erase the live session or pretend it persisted. */
export function saveGarageToStorage(storage:{setItem(key:string,value:string):void}|null|undefined,state:GarageState):boolean {
  if(!storage)return false;
  try{storage.setItem('doomsday-garage-v1',JSON.stringify(state));return true;}catch{return false;}
}
