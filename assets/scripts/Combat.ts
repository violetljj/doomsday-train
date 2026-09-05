export type Phase = 'menu' | 'combat' | 'reward' | 'arrange' | 'upgrade' | 'paused' | 'win' | 'lose';
export type Form = 'flame' | 'tornado' | 'twin' | 'giant';
export interface Enemy { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; kind: number; flash: number; }
export interface Vortex { id: number; x: number; y: number; dx: number; dy: number; life: number; radius: number; tick: number; }
export interface Effect { type: string; x: number; y: number; size: number; }

/** Engine-independent, fixed-step combat. Coordinates match the 720 × 1280 UI. */
export class Combat {
  phase: Phase = 'menu';
  previous: Phase = 'combat';
  form: Form = 'flame';
  time = 0; hp = 100; kills = 0; seed = 137; initialSeed = 137;
  enemies: Enemy[] = []; vortices: Vortex[] = []; effects: Effect[] = [];
  events: { type: string; time: number; value?: string }[] = [];
  aim = { x: 220, y: 40 }; fireFlash = 0;
  private nextId = 0; private spawnClock = 0; private fireClock = 0;
  private accumulator = 0; private rewarded = false; private upgraded = false;

  start(seed = 137) {
    this.phase = 'combat'; this.form = 'flame'; this.time = 0; this.hp = 100; this.kills = 0;
    this.seed = seed >>> 0 || 137; this.initialSeed = this.seed;
    this.enemies = []; this.vortices = []; this.effects = []; this.events = [];
    this.nextId = 0; this.spawnClock = 0; this.fireClock = 0; this.accumulator = 0;
    this.rewarded = false; this.upgraded = false;
    this.events.push({ type: 'run_start', time: 0 });
    for (let i = 0; i < 5; i++) this.spawn(true);
  }
  private random() {
    let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    this.seed = s >>> 0; return this.seed / 4294967296;
  }
  private spawn(near = false) {
    if (this.enemies.length >= 100) return;
    const side = this.random() > .5 ? 1 : -1;
    const kind = this.time > 28 && this.random() < .18 ? 2 : this.time > 15 && this.random() < .28 ? 1 : 0;
    const hp = kind === 2 ? 72 : kind === 1 ? 17 : 24;
    this.enemies.push({ id: this.nextId++, x: side * (near ? 190 + this.random() * 95 : 365 + this.random() * 30),
      y: -220 + this.random() * 510, hp, maxHp: hp, kind, speed: kind === 1 ? 65 : kind === 2 ? 28 : 36,
      flash: 0 });
  }
  advance(delta: number) {
    if (this.phase !== 'combat') return;
    this.accumulator += Math.min(Math.max(delta, 0), .1);
    while (this.accumulator >= 1 / 30 && this.phase === 'combat') {
      this.accumulator -= 1 / 30; this.step(1 / 30);
    }
    if (this.phase !== 'combat') this.accumulator = 0;
  }
  private step(dt: number) {
    this.time += dt; this.fireFlash = Math.max(0, this.fireFlash - dt);
    const rate = this.time < 8 ? 1.8 : this.time < 25 ? 4.2 : this.time < 50 ? 7 : 12;
    this.spawnClock += dt * rate;
    while (this.spawnClock >= 1) { this.spawnClock--; this.spawn(); }
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      const tx = Math.sign(e.x) * 42, ty = Math.max(-125, Math.min(205, e.y));
      const dx = tx - e.x, dy = ty - e.y, distance = Math.hypot(dx, dy);
      if (distance < 14) {
        e.hp = 0; this.hp = Math.max(0, this.hp - (e.kind === 2 ? 12 : 5));
        this.effects.push({ type: 'damage', x: e.x, y: e.y, size: 28 });
      } else { e.x += dx / distance * e.speed * dt; e.y += dy / distance * e.speed * dt; }
    }
    const candidates = this.enemies.filter(e => e.hp > 0).sort((a,b) => Math.hypot(a.x,a.y-40)-Math.hypot(b.x,b.y-40));
    const target = candidates[0];
    if (target) this.aim = { x: target.x, y: target.y };
    this.fireClock -= dt;
    if (target && this.fireClock <= 0) {
      if (this.form === 'flame') {
        this.fireClock = .12; this.fireFlash = .16;
        const angle = Math.atan2(target.y - 40, target.x);
        for (const e of candidates) {
          const a = Math.atan2(e.y - 40, e.x);
          const diff = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
          if (Math.hypot(e.x, e.y-40) < 265 && Math.abs(diff) < .48) this.hurt(e, 5);
        }
      } else {
        this.fireClock = this.form === 'twin' ? .48 : this.form === 'giant' ? .68 : .65;
        const angle = Math.atan2(target.y - 40, target.x);
        this.vortex(angle + (this.form === 'twin' ? -.22 : 0));
        if (this.form === 'twin') this.vortex(angle + .22);
        this.effects.push({ type: 'fire', x: 0, y: 40, size: 18 });
      }
    }
    for (const v of this.vortices) {
      v.life -= dt; v.x += v.dx * dt; v.y += v.dy * dt; v.tick -= dt;
      if (v.tick <= 0) {
        v.tick += .15;
        for (const e of this.enemies) {
          if (e.hp <= 0 || Math.hypot(e.x-v.x, e.y-v.y) > v.radius + 12) continue;
          this.hurt(e, this.form === 'giant' ? 18 : 13);
          e.x += v.dx * .014; e.y += v.dy * .014;
        }
      }
    }
    this.vortices = this.vortices.filter(v => v.life > 0);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.hp <= 0) return this.finish('lose');
    if (this.time >= 60 - .00001) return this.finish('win');
    if (!this.rewarded && this.time >= 8 - .00001) {
      this.rewarded = true; this.phase = 'reward'; this.events.push({ type: 'wind_reward', time: this.time });
    } else if (!this.upgraded && this.time >= 25 - .00001) {
      this.upgraded = true; this.phase = 'upgrade'; this.events.push({ type: 'upgrade_offer', time: this.time });
    }
  }
  private hurt(e: Enemy, amount: number) {
    if (e.hp <= 0) return;
    e.hp -= amount; e.flash = .09;
    if (e.hp <= 0) { this.kills++; this.effects.push({ type: 'kill', x: e.x, y: e.y, size: e.kind === 2 ? 26 : 16 }); }
  }
  private vortex(angle: number) {
    const giant = this.form === 'giant';
    this.vortices.push({ id: this.nextId++, x: 0, y: 40, dx: Math.cos(angle) * (giant ? 145 : 210),
      dy: Math.sin(angle) * (giant ? 145 : 210), life: giant ? 3.1 : 2.35, radius: giant ? 106 : 65, tick: 0 });
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
  pause() { if (!['menu','win','lose','paused'].includes(this.phase)) { this.previous = this.phase; this.phase = 'paused'; this.accumulator = 0; } }
  resume() { if (this.phase === 'paused') this.phase = this.previous; }
  private finish(phase: 'win' | 'lose') { this.phase = phase; this.events.push({ type: 'run_end', value: phase, time: this.time }); }
}
