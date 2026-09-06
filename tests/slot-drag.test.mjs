import assert from 'node:assert/strict';
import { SlotDrag, workshopSlotAt } from '../assets/scripts/SlotDrag.ts';
import { Combat } from '../assets/scripts/Combat.ts';

const d=new SlotDrag();
assert.equal(workshopSlotAt(-244,146,5),0);
assert.equal(workshopSlotAt(244,146,5),4);
assert.equal(workshopSlotAt(0,-303,5),-1); // Resume button is never a drop target.
assert.equal(workshopSlotAt(330,146,5),-1);
d.start(7,0,-244,146);
assert.equal(d.advance(.2),false); // Short taps retain existing click handling.
d.move(8,244,146);assert.equal(d.x,-244); // Second finger cannot move the car.
d.start(8,4,244,146);assert.equal(d.source,0);
d.move(7,-238,149);assert.equal(d.advance(.16),true); // Allow natural finger jitter.
d.move(7,244,146);assert.equal(d.active,true);
const m=new Combat();m.start(137,true);m.openWorkshop();
const original=m.slots[0];original.mods.rapid=2;
assert.equal(m.swapSlots(d.source,workshopSlotAt(d.x,d.y,5)),true);
assert.equal(m.slots[4],original);assert.equal(m.slots[0],null);
assert.equal(m.slots[4].mods.rapid,2);
assert.equal(m.swapSlots(4,0),true);assert.equal(m.slots[0],original);
d.reset();assert.equal(d.pointer,-1);assert.equal(d.active,false);
d.start(1,0,-244,146);d.move(1,-200,146);
assert.equal(d.advance(1),false);assert.equal(d.cancelled,true); // Early swipe does not arm.
d.reset();d.start(1,0,-244,146);d.advance(.36);d.move(1,0,-303);
assert.equal(workshopSlotAt(d.x,d.y,5),-1); // Outside release must not swap or click a button.
d.reset();assert.equal(d.advance(1),false); // Cancel/hide clears the timer.
console.log('Long-press threshold, jitter, multitouch, cancellation and state-preserving movement passed.');
