import { CAR_TYPES, CARS, MODS, RECIPES, getRecipe } from './Catalog.ts';
import type { CarType, ModId, Recipe } from './Catalog.ts';

export type Phase = 'menu' | 'combat' | 'supply' | 'workshop' | 'paused' | 'win' | 'lose';
export type DamageType = 'physical' | 'fire' | 'electric' | 'ice';
export interface Car { id: number; type: CarType; angle: number; previousAngle: number; flash: number; level: number; }
export interface Offer { kind: 'car' | 'mod'; id: CarType | ModId; }
export interface Enemy { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; kind: number; flash: number; slow?: number; freeze?: number; armorBreak?: number; burn?: number; burnDamage?: number; burnClock?: number; }
export interface Effect { type: string; x: number; y: number; size: number; dx?: number; dy?: number; enemyKind?: number; recipeId?: string; carSlot?: number; }
export interface Vortex { id: number; x: number; y: number; dx: number; dy: number; life: number; maxLife: number; age: number; radius: number; tick: number; damage: number; kind: 'fire' | 'electric'; element: 'fire' | 'electric'; recipeId?: string; carSlot?: number; }
export interface Projectile { id: number; x: number; y: number; dx: number; dy: number; life: number; radius: number; kind: string; damage: number; element: DamageType; recipeId?: string; carSlot?: number; hitIds: number[]; burnDamage?: number; }
export const SLOT_Y = [40, -70, -180, -290, -400];
const REWARDS = [8, 24, 48, 80, 120, 170];
interface CarClock { cooldown: number; targetId: number | null; }

/** Deterministic 30 Hz simulation. Every attack keeps its creation-time damage. */
export class Combat {
  phase: Phase = 'menu'; previous: Phase = 'combat';
  time = 0; hp = 100; maxHp = 100; kills = 0; scrap = 0; nextScrap = 8; supplyCount = 0;
  seed = 137; initialSeed = 137; revision = 0; linkLevel = 0;
  slots: (Car | null)[] = SLOT_Y.map(() => null);
  pendingCar: CarType | null = null; offers: Offer[] = [];
  enemies: Enemy[] = []; vortices: Vortex[] = []; projectiles: Projectile[] = []; effects: Effect[] = [];
  events: { type: string; time: number; value?: string }[] = [];
  seenRecipes = new Set<string>();
  bossSpawned = false; bossCharge = 0; endReason = '';
  private nextId = 0; private accumulator = 0; private spawnClock = 0; private bossClock = 0; private waveIndex = 0;
  private carClocks = new Map<number, CarClock>(); private linkClocks = new Map<string, number>();

  get boss(): Enemy | null { return this.enemies.find(e => e.kind === 3 && e.hp > 0) || null; }
  get links(): { index: number; recipe: Recipe; driver: number; support: number }[] {
    const result: { index: number; recipe: Recipe; driver: number; support: number }[] = [];
    for (let i = 0; i < SLOT_Y.length - 1; i++) {
      const a = this.slots[i], b = this.slots[i + 1];
      const recipe = a && b ? getRecipe(a.type, b.type) : null;
      if (recipe) {
        const driver = a!.type === recipe.executor ? i : i + 1;
        result.push({ index: i, recipe, driver, support: driver === i ? i + 1 : i });
      }
    }
    return result;
  }
  private arc(from: number, to: number) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  getRenderAngle(slot: number) {
    const car = this.slots[slot]; if (!car) return 0;
    if (this.phase !== 'combat') return car.angle;
    return car.previousAngle + this.arc(car.previousAngle, car.angle) * Math.min(1, Math.max(0, this.accumulator * 30));
  }
  private freezeInterpolation() { this.accumulator = 0; for (const car of this.slots) if (car) car.previousAngle = car.angle; }
  private random() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return this.seed / 4294967296; }
  private shuffle<T>(input: T[]): T[] {
    const values = input.slice();
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    return values;
  }
  private makeCar(type: CarType): Car {
    const car: Car = { id: this.nextId++, type, angle: 0, previousAngle: 0, flash: 0, level: 0 };
    this.carClocks.set(car.id, { cooldown: 0, targetId: null }); return car;
  }
  start(seed = 137) {
    this.phase = 'combat'; this.previous = 'combat'; this.time = 0; this.hp = this.maxHp = 100; this.kills = this.scrap = 0;
    this.seed = seed >>> 0 || 137; this.initialSeed = this.seed; this.nextId = 0; this.accumulator = this.spawnClock = this.bossClock = this.waveIndex = 0;
    this.enemies = []; this.vortices = []; this.projectiles = []; this.effects = []; this.events = []; this.seenRecipes.clear();
    this.carClocks.clear(); this.linkClocks.clear(); this.slots = SLOT_Y.map(() => null); this.slots[0] = this.makeCar('cannon');
    this.pendingCar = null; this.offers = []; this.supplyCount = 0; this.nextScrap = REWARDS[0]; this.linkLevel = 0;
    this.bossSpawned = false; this.bossCharge = 0; this.endReason = ''; this.revision++;
    this.events.push({ type: 'run_start', time: 0 });
    for (let i = 0; i < 5; i++) this.spawn(true);
  }
  seedSeenRecipes(ids: string[]) { for (const id of ids) if (RECIPES.some(r => r.id === id)) this.seenRecipes.add(id); }
  private linkKey(index: number, recipe: Recipe) {
    const a = this.slots[index]!.id, b = this.slots[index + 1]!.id;
    return `${Math.min(a,b)}:${Math.max(a,b)}:${recipe.id}`;
  }
  private syncStructure() {
    const ids = new Set(this.slots.filter((c): c is Car => !!c).map(c => c.id));
    for (const id of this.carClocks.keys()) if (!ids.has(id)) this.carClocks.delete(id);
    // Retain pair cooldowns across moves and temporary gaps; only scrapping a car removes its history.
    for (const key of this.linkClocks.keys()) {
      const [a,b] = key.split(':').map(Number);
      if (!ids.has(a) || !ids.has(b)) this.linkClocks.delete(key);
    }
    this.freezeInterpolation(); this.revision++;
  }
  private validSlot(index: number) { return Number.isInteger(index) && index >= 0 && index < SLOT_Y.length; }
  openWorkshop(): boolean {
    if (this.phase !== 'combat') return false;
    this.phase = 'workshop'; this.freezeInterpolation(); this.revision++; return true;
  }
  install(index: number): boolean {
    if (this.phase !== 'workshop' || !this.pendingCar || !this.validSlot(index)) return false;
    this.slots[index] = this.makeCar(this.pendingCar); this.pendingCar = null;
    this.events.push({ type: 'car_installed', time: this.time, value: `${index}:${this.slots[index]!.type}` });
    this.effects.push({ type: 'upgrade', x: 0, y: SLOT_Y[index], size: 70, carSlot: index }); this.syncStructure(); return true;
  }
  swapSlots(a: number, b: number): boolean {
    if (this.phase !== 'workshop' || !this.validSlot(a) || !this.validSlot(b) || a === b) return false;
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
    this.events.push({ type: 'cars_swapped', time: this.time, value: `${a}:${b}` }); this.syncStructure(); return true;
  }
  discardOffer(): boolean {
    if (this.phase !== 'workshop' || !this.pendingCar) return false;
    this.pendingCar = null; this.revision++; return true;
  }
  resumeWorkshop(): boolean {
    if (this.phase !== 'workshop' || this.pendingCar) return false;
    this.phase = 'combat'; this.freezeInterpolation(); this.revision++; return true;
  }
  private availableMods(): ModId[] {
    return (Object.keys(MODS) as ModId[]).filter(id => {
      const target = MODS[id].target;
      return target === 'links' ? this.links.length > 0 && this.linkLevel < 2 : this.slots.some(car => car && car.type === target && car.level < 2);
    });
  }
  private supply() {
    let cars: CarType[];
    if (this.supplyCount === 0) cars = ['fan', 'cryo', this.shuffle(CAR_TYPES.filter(t => CARS[t].role === 'offense'))[0]];
    else cars = this.shuffle(CAR_TYPES).slice(0, 3);
    this.offers = cars.map(id => ({ kind: 'car', id }));
    if (this.supplyCount >= SLOT_Y.length - 1) {
      const mods = this.availableMods();
      if (mods.length) this.offers[2] = { kind: 'mod', id: mods[Math.floor(this.random() * mods.length)] };
    }
    this.supplyCount++; this.nextScrap = REWARDS[this.supplyCount] ?? Infinity; this.phase = 'supply'; this.revision++;
    this.events.push({ type: 'supply_offer', time: this.time, value: String(this.supplyCount) });
  }
  chooseOffer(index: number): boolean {
    if (this.phase !== 'supply' || !Number.isInteger(index) || index < 0 || index >= this.offers.length) return false;
    const offer = this.offers[index];
    if (offer.kind === 'car') {
      if (!CAR_TYPES.includes(offer.id as CarType)) return false;
      this.pendingCar = offer.id as CarType; this.phase = 'workshop';
    } else {
      const id = offer.id as ModId;
      if (!this.availableMods().includes(id)) return false;
      const target = MODS[id].target;
      if (target === 'links') this.linkLevel++;
      else for (const car of this.slots) if (car?.type === target) car.level = Math.min(2, car.level + 1);
      this.effects.push({ type: 'upgrade', x: 0, y: -145, size: 100 }); this.phase = 'combat';
    }
    this.events.push({ type: 'offer_chosen', time: this.time, value: `${offer.kind}:${offer.id}` });
    this.offers = []; this.freezeInterpolation(); this.revision++; return true;
  }
  pause() { if (this.phase === 'combat' || this.phase === 'supply' || this.phase === 'workshop') { this.previous = this.phase; this.phase = 'paused'; this.freezeInterpolation(); } }
  resume() { if (this.phase === 'paused') { this.phase = this.previous; this.freezeInterpolation(); } }
  /** Clamp real frame time before scaling. Modal boundaries discard any unused simulation time. */
  advance(delta: number, speed = 1): number {
    if (this.phase !== 'combat') return 0;
    this.accumulator += (Number.isFinite(delta) ? Math.min(.1, Math.max(0, delta)) : 0) * (speed === 2 || speed === 4 ? speed : 1);
    let steps = 0;
    while (this.accumulator + 1e-10 >= 1 / 30 && this.phase === 'combat') {
      this.accumulator = Math.max(0, this.accumulator - 1 / 30); this.step(1 / 30); steps++;
    }
    if (this.phase !== 'combat') this.freezeInterpolation();
    return steps / 30;
  }
  private spawn(near = false) {
    if (this.enemies.length >= (this.bossSpawned ? 100 : 99)) return;
    const roll = this.random();
    const kind = this.time >= 38 && roll < .12 ? 5 : this.time >= 30 && roll < .24 ? 4 : this.time >= 18 && roll < .37 ? 2 : this.time >= 12 && roll < .53 ? 1 : 0;
    const hp = kind === 1 ? 17 : kind === 2 ? 48 : kind === 4 ? 30 : kind === 5 ? 32 : 24;
    this.enemies.push({ id: this.nextId++, x: (this.random() > .5 ? 1 : -1) * (near ? 185 + this.random() * 75 : 370 + this.random() * 25),
      y: -360 + this.random() * 680, hp, maxHp: hp, speed: kind === 1 ? 61 : kind === 2 ? 27 : 34, kind, flash: 0 });
  }
  private spawnBoss() {
    this.bossSpawned = true; this.bossClock = 0; this.bossCharge = 0;
    this.enemies.push({ id: this.nextId++, x: 285, y: 200, hp: 1400, maxHp: 1400, speed: 0, kind: 3, flash: 0 });
    this.events.push({ type: 'boss_spawn', time: this.time }); this.effects.push({ type: 'boss', x: 285, y: 200, size: 70 });
  }
  private bossRange(index: number): number {
    const car=this.slots[index]!;
    if(car.type==='fan')return -1; // Boss is immune to the fan's independent push.
    let range=car.type==='cannon'?780:car.type==='flame'?240:car.type==='tesla'?550:245;
    for(const link of this.links)if(link.driver===index){
      const id=link.recipe.id;
      range=Math.max(range,id==='cannon-fan'?1240:id==='cannon-cryo'?780:id==='flame-fan'?510:Infinity);
    }
    return range;
  }
  private target(x: number, y: number, lockedId: number | null = null, bossRange = Infinity): Enemy | undefined {
    const boss=this.boss;
    if (boss && Math.hypot(boss.x-x,boss.y-y)<=bossRange) return boss;
    const live = this.enemies.filter(e => e.hp > 0 && e.kind!==3).sort((a,b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
    const nearest = live[0], locked = live.find(e => e.id === lockedId);
    return nearest && locked && Math.hypot(locked.x-x,locked.y-y) <= Math.hypot(nearest.x-x,nearest.y-y)*1.3+20 ? locked : nearest;
  }
  private step(dt: number) {
    this.time += dt;
    if (!this.bossSpawned && this.time >= 60 - .00001) this.spawnBoss();
    if (this.waveIndex < 3 && this.time >= [18, 38, 55][this.waveIndex] - .00001) {
      const mark = [18,38,55][this.waveIndex++]; this.effects.push({ type: 'wave', x: 0, y: 260, size: mark }); this.events.push({ type: 'wave', time: this.time, value: String(mark) });
    }
    // Supported single-target weapons clear fewer bodies than the retired moving fire AoE.
    // Keep sustained pressure near that throughput instead of accumulating a permanent 99-enemy backlog.
    const rate = this.time < 8 ? 2.6 : this.time < 20 ? 4.5 : this.time < 40 ? 4.2 : this.time < 60 ? 5 : 3.5;
    this.spawnClock += dt * rate; while (this.spawnClock >= 1) { this.spawnClock--; this.spawn(); }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0,e.flash-dt); e.slow = Math.max(0,(e.slow||0)-dt); e.freeze = Math.max(0,(e.freeze||0)-dt); e.armorBreak = Math.max(0,(e.armorBreak||0)-dt);
      if ((e.burn || 0) > 0) {
        e.burn = Math.max(0,e.burn!-dt); e.burnClock = (e.burnClock ?? .5)-dt;
        if (e.burnClock <= .00001) { e.burnClock += .5; this.hit(e,e.burnDamage || 0,'fire',e.x-1,e.y); }
      }
      if (e.hp <= 0 || e.kind === 3) continue;
      const tx = Math.sign(e.x)*42, ty = Math.max(SLOT_Y[SLOT_Y.length - 1],Math.min(120,e.y));
      const dx = tx-e.x, dy = ty-e.y, distance = Math.hypot(dx,dy);
      if (distance < 14) { e.hp = 0; this.hp = Math.max(0,this.hp-(e.kind===2?10:5)); this.effects.push({type:'damage',x:e.x,y:e.y,size:28}); }
      else { const speed = (e.freeze!>0?0:e.slow!>0?.5:1)*e.speed; e.x += dx/distance*speed*dt; e.y += dy/distance*speed*dt; }
    }
    if (this.hp <= 0) return this.finish('lose','armor');
    for (let i=0;i<SLOT_Y.length;i++) if(this.slots[i]) this.updateCar(i,dt);
    for (const [key,cooldown] of this.linkClocks) this.linkClocks.set(key,Math.max(0,cooldown-dt));
    for (const link of this.links) {
      const key = this.linkKey(link.index,link.recipe);
      let cooldown = this.linkClocks.get(key) ?? 0;
      if(cooldown<=0 && this.triggerLink(link.index,link.recipe)) cooldown = this.linkInterval(link.recipe.id);
      this.linkClocks.set(key,cooldown);
    }
    this.moveProjectiles(dt); this.moveVortices(dt);
    this.enemies = this.enemies.filter(e=>e.hp>0);
    if(this.bossSpawned&&!this.boss) return this.finish('win','boss');
    if(this.boss) {
      this.bossClock += dt; this.bossCharge = Math.min(1,this.bossClock/4.5);
      if(this.bossClock>=4.5-.00001) { this.bossClock-=4.5;this.bossCharge=0;this.hp=Math.max(0,this.hp-16);this.effects.push({type:'slam',x:0,y:40,size:130});this.events.push({type:'boss_slam',time:this.time}); }
    }
    if(this.hp<=0) return this.finish('lose','armor');
    if(this.time>=80-.00001) return this.finish('lose','timeout');
    if(this.supplyCount<REWARDS.length&&this.scrap>=this.nextScrap) this.supply();
  }
  private updateCar(index:number,dt:number) {
    const car=this.slots[index]!, clock=this.carClocks.get(car.id)!;const y=SLOT_Y[index];
    car.previousAngle=car.angle;car.flash=Math.max(0,car.flash-dt);clock.cooldown-=dt;
    const target=this.target(0,y,clock.targetId,this.bossRange(index));clock.targetId=target?.id??null;if(!target)return;
    const desired=Math.atan2(target.y-y,target.x),error=this.arc(car.angle,desired);
    car.angle=this.arc(0,car.angle+Math.max(-10*dt,Math.min(10*dt,error*(1-Math.exp(-20*dt)))));
    if(clock.cooldown>0)return;
    const scale=1+car.level*.35, aligned=Math.abs(this.arc(car.angle,desired))<.2;
    if((car.type==='cannon'||car.type==='flame'||car.type==='fan')&&!aligned)return;
    car.flash=.15;
    if(car.type==='cannon') { clock.cooldown=.66;this.projectile(index,'cannon',26*scale,'physical',car.angle);this.directionEffect('fire',index,18); }
    else if(car.type==='flame') { clock.cooldown=.2;this.cone(index,car.angle,240,.56,6*scale,'fire');this.directionEffect('flame',index,240); }
    else if(car.type==='fan') {
      clock.cooldown=.4;this.directionEffect('fan',index,250);
      for(const e of this.enemies) if(e.hp>0&&e.kind!==3&&Math.hypot(e.x,e.y-y)<250&&Math.abs(this.arc(car.angle,Math.atan2(e.y-y,e.x)))<.95)this.push(e,0,y,26*scale);
    } else if(car.type==='tesla') {
      clock.cooldown=.95;
      const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x,e.y-y)<550).sort((a,b)=>Math.hypot(a.x,a.y-y)-Math.hypot(b.x,b.y-y)).slice(0,3);
      for(const e of targets){this.effects.push({type:'tesla',x:0,y,dx:e.x,dy:e.y-y,size:16*scale,carSlot:index});this.hit(e,16*scale,'electric',0,y,undefined,index);}
    } else {
      clock.cooldown=1.6;this.effects.push({type:'cryo',x:0,y,size:245,carSlot:index});
      for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-y)<245){this.chill(e,1.8);this.hit(e,4*scale,'ice',0,y,undefined,index);}
    }
  }
  private directionEffect(type:string,index:number,size:number,recipeId?:string) {
    const car=this.slots[index]!;this.effects.push({type,x:0,y:SLOT_Y[index],size,dx:Math.cos(car.angle),dy:Math.sin(car.angle),carSlot:index,recipeId});
  }
  private cone(index:number,angle:number,range:number,width:number,damage:number,element:DamageType,recipeId?:string) {
    const y=SLOT_Y[index];
    for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x,e.y-y)<range&&Math.abs(this.arc(angle,Math.atan2(e.y-y,e.x)))<width)this.hit(e,damage,element,0,y,recipeId,index);
  }
  private projectile(index:number,kind:string,damage:number,element:DamageType,angle:number,recipeId?:string,burnDamage?:number) {
    const speed=kind==='pierce'?620:390;
    this.projectiles.push({id:this.nextId++,x:0,y:SLOT_Y[index],dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,life:2,radius:kind==='cannon'?8:12,kind,damage,element,recipeId,carSlot:index,hitIds:[],burnDamage});
  }
  private linkInterval(id:string) { return id==='flame-fan'?.5:1.6; }
  private triggerLink(index:number,recipe:Recipe):boolean {
    const a=this.slots[index]!,b=this.slots[index+1]!;
    const scale=(1+.2*(a.level+b.level))*(1+.25*this.linkLevel);
    const driver=a.type===recipe.executor?index:index+1,support=driver===index?index+1:index;
    const car=this.slots[driver]!,originY=SLOT_Y[driver],target=this.target(0,originY,null,this.bossRange(driver));
    if(!target)return false;
    if(Math.abs(this.arc(car.angle,Math.atan2(target.y-originY,target.x)))>=.25)return false;
    const id=recipe.id;
    this.effects.push({type:'link-feed',x:0,y:SLOT_Y[support],dx:0,dy:originY-SLOT_Y[support],size:20,carSlot:driver,recipeId:id});
    if(id==='cannon-fan') {
      this.projectile(driver,'pierce',36*scale,'physical',car.angle,id);this.directionEffect('pierce',driver,24,id);
    } else if(id==='cannon-cryo') {
      this.projectile(driver,'shatter',30*scale,'ice',car.angle,id);this.directionEffect('shatter',driver,24,id);
    } else if(id==='flame-fan') {
      this.cone(driver,car.angle,510,.19,52*scale,'fire',id);this.directionEffect('focused-flame',driver,510,id);
    } else if(id==='flame-cryo') {
      this.effects.push({type:'link-shot',x:0,y:originY,dx:target.x,dy:target.y-originY,size:8,recipeId:id,carSlot:driver});
      this.effects.push({type:'thermal',x:target.x,y:target.y,size:105,recipeId:id,carSlot:driver});
      for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<=105)this.hit(e,28*scale*((e.slow||0)>0||(e.freeze||0)>0?2:1),'ice',0,originY,id,driver);
    } else if(id==='fan-tesla') {
      this.effects.push({type:'link-shot',x:0,y:originY,dx:target.x,dy:target.y-originY,size:8,recipeId:id,carSlot:driver});
      this.vortices.push({id:this.nextId++,x:target.x,y:target.y,dx:0,dy:0,life:1.8,maxLife:1.8,age:0,radius:92,tick:0,damage:7*scale,kind:'electric',element:'electric',recipeId:id,carSlot:driver});
      this.effects.push({type:'electric-vortex',x:target.x,y:target.y,size:92,recipeId:id,carSlot:driver});
    } else if(id==='tesla-cryo') {
      const targets=[target,...this.enemies.filter(e=>e.hp>0&&e.id!==target.id&&Math.hypot(e.x-target.x,e.y-target.y)<=165).slice(0,3)];
      for(const e of targets){const cold=(e.slow||0)>0||(e.freeze||0)>0;this.effects.push({type:'conduction',x:0,y:originY,dx:e.x,dy:e.y-originY,size:20,recipeId:id,carSlot:driver});this.hit(e,(cold?28:16)*scale,'electric',0,originY,id,driver);this.chill(e,2,e===target?1:0);}
    }
    if(!this.seenRecipes.has(id)){this.seenRecipes.add(id);this.effects.push({type:'discovery',x:0,y:originY,size:100,recipeId:id,carSlot:driver});this.events.push({type:'combo_discovered',time:this.time,value:id});}
    return true;
  }
  private ignite(e:Enemy,damage:number) {
    if(e.hp<=0)return;
    const active=(e.burn||0)>0;
    e.burnDamage=active?Math.max(e.burnDamage||0,damage):damage;
    e.burnClock=active?(e.burnClock??.5):.5;e.burn=2.5;
  }
  private chill(e:Enemy,slow:number,freeze=0) {if(e.kind===3||e.hp<=0)return;e.slow=Math.max(e.slow||0,slow);e.freeze=Math.max(e.freeze||0,freeze);}
  private push(e:Enemy,x:number,y:number,amount:number) {if(e.kind===3||e.hp<=0)return;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);if(d>.001){e.x+=dx/d*amount;e.y+=dy/d*amount;}}
  private hit(e:Enemy,damage:number,element:DamageType,x:number,y:number,recipeId?:string,carSlot?:number) {
    if(e.hp<=0||damage<=0)return;
    const resistance=element==='physical'&&e.kind===2&&!(e.armorBreak!>0)?.45:element==='fire'&&e.kind===4?.25:element==='electric'&&e.kind===5?.25:1;
    e.hp-=damage*resistance;e.flash=.09;const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy);const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0;
    this.effects.push({type:'hit',x:e.x,y:e.y,size:e.kind===3?10:5,dx:nx,dy:ny,enemyKind:e.kind,recipeId,carSlot});
    if(e.hp<=0){this.kills++;this.scrap+=e.kind===3?5:1;this.effects.push({type:'kill',x:e.x,y:e.y,size:e.kind===3?70:e.kind===2?26:16,dx:nx,dy:ny,enemyKind:e.kind,recipeId,carSlot});}
  }
  private segmentDistance(x:number,y:number,ax:number,ay:number,bx:number,by:number) {
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
    return Math.hypot(x-ax-t*dx,y-ay-t*dy);
  }
  private moveProjectiles(dt:number) {
    for(const p of this.projectiles){
      const ox=p.x,oy=p.y;p.life-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;if(p.life<=0)continue;
      const touched=this.enemies.filter(e=>e.hp>0&&!p.hitIds.includes(e.id)&&this.segmentDistance(e.x,e.y,ox,oy,p.x,p.y)<=p.radius+(e.kind===3?48:12)).sort((a,b)=>Math.hypot(a.x-ox,a.y-oy)-Math.hypot(b.x-ox,b.y-oy));
      for(const e of touched){
        p.hitIds.push(e.id);
        if(p.kind==='burn-shell'){
          this.effects.push({type:'burn-blast',x:e.x,y:e.y,size:85,recipeId:p.recipeId,carSlot:p.carSlot});
          for(const other of this.enemies)if(other.hp>0&&Math.hypot(other.x-e.x,other.y-e.y)<=85){this.ignite(other,p.burnDamage||4);this.hit(other,p.damage,p.element,ox,oy,p.recipeId,p.carSlot);}
        }else{
          const frozen=(e.freeze||0)>0;if(p.kind==='magnetic')e.armorBreak=3;
          this.hit(e,p.damage*(p.kind==='shatter'&&frozen?2:1),p.element,ox,oy,p.recipeId,p.carSlot);
          if(p.kind==='shatter')this.chill(e,2,1.3);
        }
        if(p.kind!=='pierce'){p.life=0;break;}
      }
    }
    this.projectiles=this.projectiles.filter(p=>p.life>0);
  }
  private moveVortices(dt:number) {
    for(const v of this.vortices){v.life-=dt;v.age+=dt;v.x+=v.dx*dt;v.y+=v.dy*dt;v.tick-=dt;}
    this.vortices=this.vortices.filter(v=>v.life>0);
    for(const e of this.enemies){
      if(e.hp<=0||e.kind===3)continue;let nearest:Vortex|undefined,distance=Infinity;
      for(const v of this.vortices){const d=Math.hypot(v.x-e.x,v.y-e.y);if(d<v.radius+48&&d<distance){nearest=v;distance=d;}}
      if(!nearest||distance<.001)continue;const nx=(nearest.x-e.x)/distance,ny=(nearest.y-e.y)/distance,strength=1-distance/(nearest.radius+48);
      const inward=Math.min(distance*5,45+125*strength),tangent=(65+100*strength)*(nearest.id%2?-1:1);
      const vx=nx*inward-ny*tangent,vy=ny*inward+nx*tangent,cap=Math.min(1,190/Math.hypot(vx,vy));e.x+=vx*cap*dt;e.y+=vy*cap*dt;
    }
    for(const v of this.vortices)if(v.tick<=0){v.tick+=.15;for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-v.x,e.y-v.y)<=v.radius+(e.kind===3?48:12))this.hit(e,v.damage,v.element,v.x-v.dx*.1,v.y-v.dy*.1,v.recipeId,v.carSlot);}
  }
  private finish(phase:'win'|'lose',reason:string) {this.phase=phase;this.endReason=reason;this.events.push({type:'run_end',value:phase,time:this.time});}
}
