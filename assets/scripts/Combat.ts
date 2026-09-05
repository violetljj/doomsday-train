export type Phase = 'menu' | 'combat' | 'reward' | 'arrange' | 'upgrade' | 'paused' | 'win' | 'lose';
export type Form = 'flame' | 'tornado' | 'twin' | 'giant';
export interface Enemy { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; kind: number; flash: number; }
export interface Vortex { id: number; x: number; y: number; dx: number; dy: number; life: number; maxLife: number; age: number; radius: number; tick: number; damage: number; }
export interface Effect { type: string; x: number; y: number; size: number; dx?: number; dy?: number; enemyKind?: number; }

/** Engine-independent, fixed-step combat. Coordinates match the 720 × 1280 UI. */
export class Combat {
  phase: Phase = 'menu';
  previous: Phase = 'combat';
  form: Form = 'flame';
  time = 0; hp = 100; kills = 0; seed = 137; initialSeed = 137;
  enemies: Enemy[] = []; vortices: Vortex[] = []; effects: Effect[] = [];
  events: { type: string; time: number; value?: string }[] = [];
  aim = { x: 220, y: 40 }; fireFlash = 0; turretAngle = 0;
  private nextId = 0; private spawnClock = 0; private fireClock = 0;
  private accumulator = 0; private rewarded = false; private upgraded = false;
  private nextWave = 0;
  private targetId: number | null = null; private previousTurretAngle = 0;

  private angleDelta(from: number, to: number) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
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
    this.events.push({ type: 'run_start', time: 0 });
    for (let i = 0; i < 5; i++) this.spawn(true);
  }
  private random() {
    let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    this.seed = s >>> 0; return this.seed / 4294967296;
  }
  private spawn(near = false, cluster?: { side: number; y: number }) {
    if (this.enemies.length >= 100) return;
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
      t < 25 ? 7 : t < 29 ? 1.6 : t < 40 ? 6.2 : t < 45 ? 7.5 : t < 50 ? 10 : t < 57 ? 12 : 4;
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
    this.wave();
    this.spawnClock += dt * this.spawnRate();
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
    const closest = candidates[0], locked = candidates.find(e => e.id === this.targetId);
    // Keep similar-distance targets stable; a substantially closer threat can interrupt.
    const target = locked && closest && Math.hypot(locked.x, locked.y - 40) <= Math.hypot(closest.x, closest.y - 40) * 1.3 + 20 ? locked : closest;
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
        this.fireClock = .12; this.fireFlash = .16;
        const angle = this.turretAngle;
        for (const e of candidates) {
          const a = Math.atan2(e.y - 40, e.x);
          const diff = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
          if (Math.hypot(e.x, e.y-40) < 265 && Math.abs(diff) < .48) this.hurt(e, 5, e.x, e.y - 40);
        }
      } else {
        this.fireClock = this.form === 'twin' ? .48 : this.form === 'giant' ? .68 : .65;
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
          if (e.hp <= 0 || Math.hypot(e.x-v.x, e.y-v.y) > v.radius + 12) continue;
          this.hurt(e, v.damage, e.x - v.x + v.dx * .16, e.y - v.y + v.dy * .16);
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.hp <= 0) return this.finish('lose');
    if (this.time >= 60 - .00001) return this.finish('win');
    if (!this.rewarded && this.time >= 8 - .00001) {
      this.rewarded = true; this.phase = 'reward'; this.events.push({ type: 'wind_reward', time: this.time });
    } else if (!this.upgraded && this.time >= 25 - .00001) {
      this.upgraded = true; this.phase = 'upgrade'; this.events.push({ type: 'upgrade_offer', time: this.time });
    }
  }
  private pullEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
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
  private hurt(e: Enemy, amount: number, dx: number, dy: number) {
    if (e.hp <= 0) return;
    const length = Math.hypot(dx, dy);
    dx = length > .001 ? dx / length : 1; dy = length > .001 ? dy / length : 0;
    e.hp -= amount; e.flash = .09;
    this.effects.push({ type: 'hit', x: e.x, y: e.y, size: e.kind === 2 ? 7 : 4, dx, dy, enemyKind: e.kind });
    if (e.hp <= 0) {
      this.kills++; this.effects.push({ type: 'kill', x: e.x, y: e.y, size: e.kind === 2 ? 26 : 16, dx, dy, enemyKind: e.kind });
    } else { e.x += dx * 2.4; e.y += dy * 2.4; }
  }
  private vortex(angle: number) {
    const giant = this.form === 'giant';
    this.vortices.push({ id: this.nextId++, x: 0, y: 40, dx: Math.cos(angle) * (giant ? 145 : 210),
      dy: Math.sin(angle) * (giant ? 145 : 210), life: giant ? 3.1 : 2.35, maxLife: giant ? 3.1 : 2.35,
      age: 0, radius: giant ? 106 : 65, tick: 0, damage: giant ? 18 : 13 });
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
  pause() { if (!['menu','win','lose','paused'].includes(this.phase)) { this.previous = this.phase; this.phase = 'paused'; this.accumulator = 0; this.previousTurretAngle = this.turretAngle; } }
  resume() { if (this.phase === 'paused') this.phase = this.previous; }
  private finish(phase: 'win' | 'lose') { this.phase = phase; this.events.push({ type: 'run_end', value: phase, time: this.time }); }
}
