export type Phase = 'menu' | 'combat' | 'reward' | 'arrange' | 'upgrade' | 'supply' | 'paused' | 'win' | 'lose';
export type Form = 'flame' | 'tornado' | 'twin' | 'giant';
export type ChoiceId = 'tesla' | 'cryo' | 'repair' | 'heat' | 'feed' | 'reach' | 'rupture' | 'overclock' | 'armor';
export const CHOICES: Record<ChoiceId, { name: string; description: string }> = {
  tesla: { name: '电弧车', description: '每1.2秒电击最近的3个敌人，各造成18伤害。' },
  cryo: { name: '冰霜车', description: '每2秒造成范围伤害，普通敌人减速50%，持续2.4秒。' },
  repair: { name: '维修车', description: '每4秒修复5点装甲，不超过装甲上限。' },
  heat: { name: '高热燃料', description: '主炮和支援伤害 +25%。' },
  feed: { name: '快速供弹', description: '主炮攻击间隔缩短20%。' },
  reach: { name: '扩散风道', description: '火焰龙卷范围 +18%。' },
  rupture: { name: '殉爆弹头', description: '击杀引发范围爆炸，伤害14/级；爆炸不连续引爆。' },
  overclock: { name: '支援超频', description: '支援车发动间隔缩短25%。' },
  armor: { name: '强化装甲', description: '装甲上限 +25，立即恢复25装甲。' },
};
const MODULES: ChoiceId[] = ['tesla', 'cryo', 'repair'];
const PERKS: ChoiceId[] = ['heat', 'feed', 'reach', 'rupture', 'overclock', 'armor'];
export interface Enemy { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; kind: number; flash: number; slow?: number; }
export interface Vortex { id: number; x: number; y: number; dx: number; dy: number; life: number; maxLife: number; age: number; radius: number; tick: number; damage: number; }
export interface Effect { type: string; x: number; y: number; size: number; dx?: number; dy?: number; enemyKind?: number; }

/** Engine-independent, fixed-step combat. Coordinates match the 720 × 1280 UI. */
export class Combat {
  phase: Phase = 'menu';
  previous: Phase = 'combat';
  form: Form = 'flame';
  time = 0; hp = 100; kills = 0; seed = 137; initialSeed = 137;
  maxHp = 100; module: 'none' | 'tesla' | 'cryo' | 'repair' = 'none';
  perks: Partial<Record<ChoiceId, number>> = {};
  choiceKind: 'module' | 'perk' = 'module'; choices: ChoiceId[] = [];
  bossSpawned = false; bossCharge = 0; endReason = '';
  enemies: Enemy[] = []; vortices: Vortex[] = []; effects: Effect[] = [];
  events: { type: string; time: number; value?: string }[] = [];
  aim = { x: 220, y: 40 }; fireFlash = 0; turretAngle = 0;
  private nextId = 0; private spawnClock = 0; private fireClock = 0;
  private accumulator = 0; private rewarded = false; private upgraded = false;
  private nextWave = 0;
  private supplyStage = 0; private supportClock = 0; private bossClock = 0;
  private targetId: number | null = null; private previousTurretAngle = 0;

  private angleDelta(from: number, to: number) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  get boss(): Enemy | null { return this.enemies.find(e => e.kind === 3 && e.hp > 0) || null; }
  private level(id: ChoiceId) { return this.perks[id] || 0; }
  private damageScale() { return 1 + this.level('heat') * .25; }
  get renderTurretAngle() {
    if (this.phase !== 'combat') return this.turretAngle;
    const alpha = Math.min(1, Math.max(0, this.accumulator * 30));
    return this.previousTurretAngle + this.angleDelta(this.previousTurretAngle, this.turretAngle) * alpha;
  }

  start(seed = 137) {
    this.phase = 'combat'; this.form = 'flame'; this.time = 0; this.hp = 100; this.kills = 0;
    this.seed = seed >>> 0 || 137; this.initialSeed = this.seed;
    this.enemies = []; this.vortices = []; this.effects = []; this.events = [];
    this.nextId = 0; this.spawnClock = 0; this.fireClock = 0; this.accumulator = 0;
    this.rewarded = false; this.upgraded = false; this.nextWave = 0;
    this.targetId = null; this.turretAngle = 0; this.previousTurretAngle = 0;
    this.aim = { x: 220, y: 40 }; this.fireFlash = 0;
    this.maxHp = 100; this.module = 'none'; this.perks = {}; this.choices = []; this.choiceKind = 'module';
    this.supplyStage = 0; this.supportClock = 0; this.bossClock = 0;
    this.bossSpawned = false; this.bossCharge = 0; this.endReason = '';
    this.events.push({ type: 'run_start', time: 0 });
    for (let i = 0; i < 5; i++) this.spawn(true);
  }
  private random() {
    let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    this.seed = s >>> 0; return this.seed / 4294967296;
  }
  private spawn(near = false, cluster?: { side: number; y: number }) {
    // Reserve the last entity slot for the authored boss entrance.
    if (this.enemies.length >= (this.bossSpawned ? 100 : 99)) return;
    const side = cluster ? cluster.side : this.random() > .5 ? 1 : -1;
    const kind = this.time > 28 && this.random() < .18 ? 2 : this.time > 15 && this.random() < .28 ? 1 : 0;
    const hp = kind === 2 ? 72 : kind === 1 ? 17 : 24;
    this.enemies.push({ id: this.nextId++, x: side * (near ? 190 + this.random() * 95 : 365 + this.random() * 30),
      y: cluster ? cluster.y + (this.random() - .5) * 100 : -220 + this.random() * 510, hp, maxHp: hp, kind, speed: kind === 1 ? 65 : kind === 2 ? 28 : 36,
      flash: 0 });
  }
  private wave() {
    const times = [5, 21, 45, 50], counts = [6, 8, 10, 16];
    if (this.nextWave >= times.length || this.time < times[this.nextWave] - .00001) return;
    const index = this.nextWave++;
    this.events.push({ type: 'wave', time: this.time, value: String(times[index]) });
    this.effects.push({ type: 'wave', x: 0, y: 260, size: times[index] });
    const cluster = { side: this.random() > .5 ? 1 : -1, y: -120 + this.random() * 300 };
    for (let i = 0; i < counts[index]; i++) this.spawn(index === 0, cluster);
  }
  private spawnRate() {
    const t = this.time;
    return t < 5 ? 1.25 : t < 8 ? 2.6 : t < 11 ? .8 : t < 19 ? 4.2 : t < 21 ? 5.8 :
      t < 25 ? 7 : t < 29 ? 1.6 : t < 40 ? 6.2 : t < 45 ? 7.5 : t < 50 ? 10 : t < 57 ? 12 :
      t < 60 ? 4 : t < 65 ? 5 : t < 70 ? 7 : 3.6;
  }
  private offerSupply() {
    this.choiceKind = this.supplyStage === 0 ? 'module' : 'perk';
    const pool = this.choiceKind === 'module' ? MODULES.slice() : PERKS.filter(id => this.level(id) < 2);
    if (this.choiceKind === 'perk') {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    this.choices = pool.slice(0, 3); this.supplyStage++; this.phase = 'supply';
    this.events.push({ type: 'supply_offer', time: this.time, value: this.choiceKind });
  }
  private spawnBoss() {
    this.bossSpawned = true; this.bossClock = 0; this.bossCharge = 0;
    const boss: Enemy = { id: this.nextId++, x: 285, y: 260, hp: 1000, maxHp: 1000, speed: 0, kind: 3, flash: 0, slow: 0 };
    this.enemies.push(boss);
    this.events.push({ type: 'boss_spawn', time: this.time });
    this.effects.push({ type: 'boss', x: boss.x, y: boss.y, size: 70 });
  }
  private support(dt: number) {
    if (this.module === 'none') return;
    this.supportClock -= dt;
    if (this.supportClock > .00001) return;
    const interval = this.module === 'tesla' ? 1.2 : this.module === 'cryo' ? 2 : 4;
    this.supportClock += interval * Math.pow(.75, this.level('overclock'));
    if (this.module === 'repair') {
      const repaired = Math.min(5, Math.max(0, this.maxHp - this.hp)); this.hp += repaired;
      this.effects.push({ type: 'repair', x: 0, y: -220, size: repaired });
      return;
    }
    const targets = this.enemies.filter(e => e.hp > 0).sort((a, b) => Math.hypot(a.x, a.y + 220) - Math.hypot(b.x, b.y + 220));
    if (this.module === 'tesla') {
      for (const e of targets.slice(0, 3)) {
        this.effects.push({ type: 'tesla', x: 0, y: -220, dx: e.x, dy: e.y + 220, size: 18 * this.damageScale() });
        this.hurt(e, 18 * this.damageScale(), e.x, e.y + 220);
      }
    } else {
      this.effects.push({ type: 'cryo', x: 0, y: -220, size: 320 });
      for (const e of targets) {
        if (Math.hypot(e.x, e.y + 220) > 320) continue;
        if (e.kind !== 3) e.slow = 2.4;
        this.hurt(e, 12 * this.damageScale(), e.x, e.y + 220);
      }
    }
  }
  /** Returns simulated seconds actually advanced, including stops at modal choices. */
  advance(delta: number, speed = 1): number {
    if (this.phase !== 'combat') return 0;
    const realDelta = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), .1) : 0;
    this.accumulator += realDelta * (speed === 2 || speed === 4 ? speed : 1);
    let steps = 0;
    while (this.accumulator + 1e-10 >= 1 / 30 && this.phase === 'combat') {
      this.accumulator = Math.max(0, this.accumulator - 1 / 30); this.step(1 / 30); steps++;
    }
    if (this.phase !== 'combat') { this.accumulator = 0; this.previousTurretAngle = this.turretAngle; }
    return steps / 30;
  }
  private step(dt: number) {
    this.time += dt; this.fireFlash = Math.max(0, this.fireFlash - dt);
    if (!this.bossSpawned && this.time >= 70 - .00001) this.spawnBoss();
    this.wave();
    this.spawnClock += dt * this.spawnRate();
    while (this.spawnClock >= 1) { this.spawnClock--; this.spawn(); }
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.slow = Math.max(0, (e.slow || 0) - dt);
      if (e.kind === 3) continue;
      const tx = Math.sign(e.x) * 42, ty = Math.max(-125, Math.min(205, e.y));
      const dx = tx - e.x, dy = ty - e.y, distance = Math.hypot(dx, dy);
      if (distance < 14) {
        e.hp = 0; this.hp = Math.max(0, this.hp - (e.kind === 2 ? 12 : 5));
        this.effects.push({ type: 'damage', x: e.x, y: e.y, size: 28 });
      } else { const speed = e.speed * (e.slow > 0 ? .5 : 1); e.x += dx / distance * speed * dt; e.y += dy / distance * speed * dt; }
    }
    if (this.hp <= 0) return this.finish('lose', 'armor');
    const candidates = this.enemies.filter(e => e.hp > 0).sort((a,b) => Math.hypot(a.x,a.y-40)-Math.hypot(b.x,b.y-40));
    const closest = candidates[0], locked = candidates.find(e => e.id === this.targetId);
    // Keep similar-distance targets stable; a substantially closer threat can interrupt.
    const target = this.boss || (locked && closest && Math.hypot(locked.x, locked.y - 40) <= Math.hypot(closest.x, closest.y - 40) * 1.3 + 20 ? locked : closest);
    this.targetId = target ? target.id : null;
    this.previousTurretAngle = this.turretAngle;
    let aligned = false;
    if (target) {
      this.aim = { x: target.x, y: target.y };
      const desired = Math.atan2(target.y - 40, target.x);
      const error = this.angleDelta(this.turretAngle, desired);
      const turn = Math.max(-10 * dt, Math.min(10 * dt, error * (1 - Math.exp(-20 * dt))));
      this.turretAngle = this.angleDelta(0, this.turretAngle + turn);
      aligned = Math.abs(this.angleDelta(this.turretAngle, desired)) < .2;
    }
    this.fireClock -= dt;
    if (target && aligned && this.fireClock <= 0) {
      if (this.form === 'flame') {
        this.fireClock = .12 * Math.pow(.8, this.level('feed')); this.fireFlash = .16;
        const angle = this.turretAngle;
        for (const e of candidates) {
          const a = Math.atan2(e.y - 40, e.x);
          const diff = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
          if (Math.hypot(e.x, e.y-40) < 265 && Math.abs(diff) < .48) this.hurt(e, 5 * this.damageScale(), e.x, e.y - 40);
        }
      } else {
        this.fireClock = (this.form === 'twin' ? .48 : this.form === 'giant' ? .68 : .65) * Math.pow(.8, this.level('feed'));
        const angle = this.turretAngle;
        this.vortex(angle + (this.form === 'twin' ? -.22 : 0));
        if (this.form === 'twin') this.vortex(angle + .22);
        this.effects.push({ type: 'fire', x: 0, y: 40, size: 18 });
      }
    }
    for (const v of this.vortices) {
      v.life -= dt; v.age += dt; v.x += v.dx * dt; v.y += v.dy * dt; v.tick -= dt;
    }
    this.vortices = this.vortices.filter(v => v.life > 0);
    this.pullEnemies(dt);
    for (const v of this.vortices) {
      if (v.tick <= 0) {
        v.tick += .15;
        for (const e of this.enemies) {
          if (e.hp <= 0 || Math.hypot(e.x-v.x, e.y-v.y) > v.radius + (e.kind === 3 ? 48 : 12)) continue;
          this.hurt(e, v.damage, e.x - v.x + v.dx * .16, e.y - v.y + v.dy * .16);
        }
      }
    }
    this.support(dt);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.bossSpawned && !this.boss) return this.finish('win', 'boss');
    if (this.boss) {
      this.bossClock += dt; this.bossCharge = Math.min(1, this.bossClock / 4.5);
      if (this.bossClock >= 4.5 - .00001) {
        this.bossClock -= 4.5; this.bossCharge = 0; this.hp = Math.max(0, this.hp - 16);
        this.effects.push({ type: 'slam', x: 0, y: 40, size: 130 });
        this.events.push({ type: 'boss_slam', time: this.time });
      }
    }
    if (this.hp <= 0) return this.finish('lose', 'armor');
    if (this.time >= 90 - .00001) return this.finish('lose', 'timeout');
    if (!this.rewarded && this.time >= 8 - .00001) {
      this.rewarded = true; this.phase = 'reward'; this.events.push({ type: 'wind_reward', time: this.time });
    } else if (!this.upgraded && this.time >= 25 - .00001) {
      this.upgraded = true; this.phase = 'upgrade'; this.events.push({ type: 'upgrade_offer', time: this.time });
    } else if (this.supplyStage < 3 && this.time >= [18, 40, 58][this.supplyStage] - .00001) {
      this.offerSupply();
    }
  }
  private pullEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.kind === 3) continue;
      let nearest: Vortex | undefined, distance = Infinity;
      for (const v of this.vortices) {
        const d = Math.hypot(v.x - e.x, v.y - e.y);
        if (d < v.radius + 48 && d < distance) { nearest = v; distance = d; }
      }
      if (!nearest || distance < .001) continue;
      const nx = (nearest.x - e.x) / distance, ny = (nearest.y - e.y) / distance;
      const strength = 1 - distance / (nearest.radius + 48);
      // Ease the inward force at the eye, and keep a visible orbit around it.
      const inward = Math.min(distance * 5, 45 + 125 * strength);
      const tangent = (65 + 100 * strength) * (nearest.id % 2 ? -1 : 1);
      let vx = nx * inward - ny * tangent, vy = ny * inward + nx * tangent;
      const cap = Math.min(1, 190 / Math.hypot(vx, vy));
      vx *= cap; vy *= cap;
      e.x += vx * dt; e.y += vy * dt;
    }
  }
  private hurt(e: Enemy, amount: number, dx: number, dy: number, allowBlast = true) {
    if (e.hp <= 0) return;
    const length = Math.hypot(dx, dy);
    dx = length > .001 ? dx / length : 1; dy = length > .001 ? dy / length : 0;
    e.hp -= amount; e.flash = .09;
    this.effects.push({ type: 'hit', x: e.x, y: e.y, size: e.kind === 2 ? 7 : 4, dx, dy, enemyKind: e.kind });
    if (e.hp <= 0) {
      this.kills++; this.effects.push({ type: 'kill', x: e.x, y: e.y, size: e.kind === 2 ? 26 : 16, dx, dy, enemyKind: e.kind });
      if (allowBlast && this.level('rupture') > 0) {
        this.effects.push({ type: 'blast', x: e.x, y: e.y, size: 90 });
        for (const other of this.enemies) {
          if (other.hp > 0 && Math.hypot(other.x - e.x, other.y - e.y) <= 90)
            this.hurt(other, 14 * this.level('rupture') * this.damageScale(), other.x - e.x, other.y - e.y, false);
        }
      }
    } else if (e.kind !== 3) { e.x += dx * 2.4; e.y += dy * 2.4; }
  }
  private vortex(angle: number) {
    const giant = this.form === 'giant';
    this.vortices.push({ id: this.nextId++, x: 0, y: 40, dx: Math.cos(angle) * (giant ? 145 : 210),
      dy: Math.sin(angle) * (giant ? 145 : 210), life: giant ? 3.1 : 2.35, maxLife: giant ? 3.1 : 2.35,
      age: 0, radius: (giant ? 106 : 65) * (1 + .18 * this.level('reach')), tick: 0, damage: (giant ? 18 : 13) * this.damageScale() });
  }
  beginArrange() { if (this.phase === 'reward') this.phase = 'arrange'; }
  installFan() {
    if (this.phase !== 'arrange') return;
    this.form = 'tornado'; this.phase = 'combat'; this.fireClock = 0;
    this.events.push({ type: 'fan_installed', time: this.time });
    this.effects.push({ type: 'upgrade', x: 0, y: -88, size: 110 });
  }
  choose(form: 'twin' | 'giant') {
    if (this.phase !== 'upgrade') return;
    this.form = form; this.phase = 'combat'; this.fireClock = 0;
    this.events.push({ type: 'upgrade_pick', value: form, time: this.time });
    this.effects.push({ type: 'upgrade', x: 0, y: 40, size: 130 });
  }
  chooseSupply(id: ChoiceId) {
    if (this.phase !== 'supply' || !this.choices.includes(id)) return;
    if (this.choiceKind === 'module') {
      if (this.module !== 'none' || !MODULES.includes(id)) return;
      this.module = id as 'tesla' | 'cryo' | 'repair';
      this.supportClock = (this.module === 'tesla' ? 1.2 : this.module === 'cryo' ? 2 : 4) * Math.pow(.75, this.level('overclock'));
    } else {
      if (!PERKS.includes(id) || this.level(id) >= 2) return;
      this.perks[id] = this.level(id) + 1;
      if (id === 'armor') { this.maxHp += 25; this.hp = Math.min(this.maxHp, this.hp + 25); }
      if (id === 'overclock') this.supportClock *= .75;
    }
    this.events.push({ type: 'supply_pick', time: this.time, value: id });
    this.effects.push({ type: 'upgrade', x: 0, y: this.choiceKind === 'module' ? -220 : 40, size: 100 });
    this.choices = []; this.phase = 'combat';
  }
  pause() { if (!['menu','win','lose','paused'].includes(this.phase)) { this.previous = this.phase; this.phase = 'paused'; this.accumulator = 0; this.previousTurretAngle = this.turretAngle; } }
  resume() { if (this.phase === 'paused') this.phase = this.previous; }
  private finish(phase: 'win' | 'lose', reason: string) { this.phase = phase; this.endReason = reason; this.events.push({ type: 'run_end', value: phase, time: this.time }); }
}
