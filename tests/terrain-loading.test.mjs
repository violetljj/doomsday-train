import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_IDS} from '../assets/scripts/Worlds.ts';
// Exercise the actual host method with a controlled asynchronous Cocos loader.
const source=readFileSync(new URL('../assets/scripts/Game.ts',import.meta.url),'utf8');
const body=source.split('  private requestNearbyTerrain() {')[1].split('  private drawGround() {')[0];
const calls=[];
const resources={load(path,type,callback){calls.push({path,callback});}};
let now=0;
const request=Function('WORLD_IDS','resources','SpriteFrame','Date','console',`return function(){${body.slice(0,body.lastIndexOf('}'))}}`)(WORLD_IDS,resources,{}, {now:()=>now},{error(){}});
const host={model:{worldState:{index:0}},terrainRetryAt:new Map(),requestedTerrain:new Set(),terrainFrames:new Map(),isValid:true};
request.call(host);request.call(host);
assert.deepEqual(calls.map(c=>c.path),['art/lastlight-foundry-v1/spriteFrame'],'Opening requests only the next region, once');
const frame={};calls[0].callback(null,frame);assert.equal(host.terrainFrames.get('foundry'),frame);
host.model.worldState.index=1;request.call(host);assert.equal(calls.length,2);assert.ok(calls[1].path.includes('frost'));
host.model.worldState.index=11;request.call(host);assert.equal(calls.length,3);assert.ok(calls[2].path.includes('skyport'),'Wrap reuses the already bootstrapped city');
host.isValid=false;calls[2].callback(null,{});assert.equal(host.terrainFrames.has('skyport'),false,'Destroyed host ignores late callback');
assert.ok(!source.includes("WORLD_IDS.filter(id=>id!=='city')"),'No eager all-region request remains');
console.log('Terrain loading: adjacent requests, deduplication, callback, wrap and teardown passed.');

host.isValid=true;host.model.worldState.index=1;
calls[1].callback(Error('temporary network failure'));
const before=calls.length;request.call(host);assert.equal(calls.length,before,'No immediate failure loop');
now=9999;request.call(host);assert.equal(calls.length,before,'Retry waits ten seconds');
now=10000;request.call(host);assert.equal(calls.length,before+1,'Transient failure retries');
const recovered={};calls.at(-1).callback(null,recovered);assert.equal(host.terrainFrames.get('frost'),recovered);
now=20000;request.call(host);assert.equal(calls.length,before+1,'Successful retry remains cached');
console.log('Terrain retry: cooldown, recovery and successful caching passed.');
