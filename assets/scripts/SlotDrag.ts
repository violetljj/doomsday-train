/** Workshop coordinates are in the 720 × 1280 design space. */
export function workshopSlotAt(x: number, y: number, count: number): number {
  const spacing = 610 / count;
  if (Math.abs(y - 139) > 100) return -1;
  for (let i = 0; i < count; i++) {
    if (Math.abs(x - (i - (count - 1) / 2) * spacing) <= (spacing - 10) / 2) return i;
  }
  return -1;
}

/** Single pointer; elapsed time is real time, independent of combat speed. */
export class SlotDrag {
  pointer = -1;
  source = -1;
  x = 0; y = 0;
  private startX = 0; private startY = 0;
  elapsed = 0;
  active = false;
  cancelled = false;
  start(pointer: number, source: number, x: number, y: number) {
    if (this.pointer !== -1) return;
    this.pointer = pointer; this.source = source;
    this.x = this.startX = x; this.y = this.startY = y;
    this.elapsed = 0; this.active = false; this.cancelled = false;
  }
  move(pointer: number, x: number, y: number) {
    if (pointer !== this.pointer) return;
    this.x = x; this.y = y;
    if (!this.active && Math.hypot(x - this.startX, y - this.startY) > 18) this.cancelled = true;
  }
  advance(dt: number): boolean {
    if (this.pointer < 0 || this.cancelled || this.active) return false;
    this.elapsed += Math.max(0, dt);
    if (this.elapsed < .35) return false;
    this.active = true; return true;
  }
  reset() { this.pointer = -1; this.source = -1; this.active = false; this.cancelled = false; this.elapsed = 0; }
}
