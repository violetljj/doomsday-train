import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, EventTouch,
  resources, SpriteFrame, Sprite, view, ResolutionPolicy, game, Game as EngineGame, Layers, profiler, Material, gfx, Rect, EffectAsset, Vec4, Vec2, Font } from 'cc';
import { Combat, SLOT_Y } from './Combat';
import { DamageNumbers, classifyDamageNumber, damageNumberPresentation, DAMAGE_ATLAS_PATH, damageGlyphRect } from './DamageNumbers';
import { renderPanel } from './PanelRenderer';
import { SlotDrag, workshopSlotAt } from './SlotDrag';
import { recommendSlot, linkChanges } from './ChoicePreview';
import { CARS, RECIPES, CarType, ModId } from './Catalog';
import { ENGINES } from './Locomotives';
import type { EngineId } from './Locomotives';
import { newGarage, readGarage, recordRun, selectGarageLoadout } from './Garage';
import { WORLDS, WORLD_IDS } from './Worlds';
import type { WorldId } from './Worlds';
import { ENEMY_LOOKS } from './EnemyPresentation';
const { ccclass } = _decorator;
const C = { ink: '#102B2D', panel: '#183A3B', edge: '#61766B', gold: '#DAB979', cream: '#F4E4BE', muted: '#ACC0B0', teal: '#8FB6A7', red: '#CF5039' };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type HitArea = { x: number; y: number; w: number; h: number; action: () => void };
type Defeated = { node: Node; x: number; y: number; vx: number; vy: number; life: number; angle: number; size: number };

@ccclass('Game')
export class Game extends Component {
  private model = new Combat();
  private bg!: Graphics; private world!: Graphics; private fx!: Graphics; private hud!: Graphics; private overlay!: Graphics;
  private details!: Graphics; private attacks!: Graphics;
  private trainLayer!: Node; private enemyLayer!: Node;
  private vortexLayer!: Node; private fireMaterial!: Material;
  private overlayNode!: Node; private worldNode!: Node; private labels: Record<string, Label> = {};
  private hitAreas: HitArea[] = []; private particles: Particle[] = []; private state = '';
  private visualTime = 0; private shake = 0; private seed = 137;
  private loco: Node | null = null; private zombieFrame: SpriteFrame | null = null;
  private carriageFrame: SpriteFrame | null = null;
  private fireFrame: SpriteFrame | null = null;
  private vortexSprites = new Map<number,Node>();
  private enemySprites = new Map<number, Node>();
  private defeated: Defeated[] = [];
  private chain = 0; private chainLife = 0; private emberClock = 0;
  private toastText = ''; private toastLife = 0;
  private audio: any = null; private sound = true; private lowMotion = false;
  private soundTimes = new Map<string, number>();
  private noiseBuffer: any = null; private flameBed: any = null; private flameUntil = 0;
  private scrapPulse = 0;
  private damageNumbers = new DamageNumbers();
  private showDamage = true;
  private digitFrames:SpriteFrame[]=[];private digitSprites:Node[]=[];
  private hudVeil:Node|null=null;
  private titleFont:Font|null=null;private bodyFont:Font|null=null;
  private garage=newGarage();private garageOpen=false;private runRecorded=true;
  private engineFrames=new Map<EngineId,SpriteFrame>();private engineFlash=0;
  private chassisFrames=new Map<EngineId,SpriteFrame>();
  private chassisMaterial:Material|null=null;
  private lastLightReady=false;
  private lastLightEnemyReady=false;
  private lastLightTitle:Node|null=null;
  private lastLightTicket:Node|null=null;
  private lastLightUi:SpriteFrame[]=[];
  private lastLightFooterIcons:Node[]=[];
  private lastLightPanel:Node|null=null;
  private lastLightReorder:Node|null=null;
  private frameCount = 0; private frameSeconds = 0; private fps = 0;
  private debugSpeed = 1;
  private carArt = new Map<number,Node>();
  private selectedSlot = -1;
  private replacementConfirmed = false;
  private assemblyRemaining = 0;
  private assemblyDepart = false;
  private workshopPositions = new Map<string,{x:number;y:number;targetX:number;targetY:number;nodes:Node[]}>();
  private firstWindFeed = false; private windLessonLife = 0; private windChainBest = 0;
  private windLessonText = '';
  private buildCelebration = 0;
  private celebratedMilestones = new Set<string>();
  private slotDrag = new SlotDrag();
  private dragGraphics!: Graphics;
  private dragLabel!: Label;
  private dragChanges: Label[] = [];
  private dragIcon: Node | null = null;
  private atlas = false; private atlasPage = 0; private atlasCars = true;
  private knownRecipes = new Set<string>(); private newRecipes = new Set<string>();
  private carIcons = new Map<CarType,SpriteFrame>();
  private weaponFrames = new Map<CarType,SpriteFrame>();
  private weaponSprites = new Map<number,Node>();
  private hullFrame:SpriteFrame|null=null;
  private menuFrame:SpriteFrame|null=null;
  private groundArt:Node|null=null;
  private groundLoop:Node|null=null;
  private terrainFrames=new Map<WorldId,SpriteFrame>();
  private menuArt:Node|null=null;
  private paperArt:Node|null=null;
  private workshopArt:Node|null=null;
  private stationArt:Node|null=null;
  private unitMaterial:Material|null=null;
  private unitAtlas:SpriteFrame|null=null;
  private expansionAtlas:SpriteFrame|null=null;
  private enemyFrames=new Map<number,SpriteFrame>();
  private enemyAtlasReady=false;
  private unitFrames=new Set<SpriteFrame>();
  private unitPivots=new Map<SpriteFrame,[number,number]>();
  private slicedFrames:SpriteFrame[]=[];
  private fxFrames:SpriteFrame[]=[];
  private flameFrames:SpriteFrame[]=[];
  private modFrames=new Map<ModId|'repair',SpriteFrame>();
  private fxPool:Node[]=[];
  private fxUsed=0;
  private flowMaterial:Material|null=null;
  private flowParams=new Vec4(0,1,0,0);
  private readonly slotY = SLOT_Y;
  private readonly combatOffset=-(SLOT_Y[0]+SLOT_Y[SLOT_Y.length-1])/2-60;
  private entranceRemaining=0;
  private supportEffects: {type:string;x:number;y:number;dx:number;dy:number;size:number;life:number;max:number;color?:string;recipeId?:string}[] = [];

  onLoad() {
    profiler.hideStats();
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    this.node.getComponent(UITransform)?.setContentSize(720,1280);
    this.bg = this.layer('Ground');
    this.worldNode = new Node('World'); this.worldNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.worldNode); this.worldNode.addComponent(UITransform).setContentSize(720,1280);
    this.world = this.layer('World drawing', this.worldNode);
    this.trainLayer = this.group('Train art',this.worldNode);
    this.details = this.layer('Mechanical parts',this.worldNode);
    this.enemyLayer = this.group('Enemies',this.worldNode);
    this.attacks = this.layer('Fire and wind',this.worldNode);
    this.vortexLayer = this.group('Vortex emission',this.worldNode);
    this.fireMaterial=new Material();
    this.fx = this.layer('Effects'); this.hud = this.layer('HUD');
    this.labels.brand = this.label(this.node, '末日列车', -310, 570, 32, C.cream, 350, 'left','display');
    this.labels.tag = this.label(this.node, '余晖防线  /  01', -310, 535, 20, C.muted, 350, 'left');
    this.labels.time = this.label(this.node, '00:00', 224, 570, 26, C.cream, 115);
    this.labels.hp = this.label(this.node, '装甲  100', -310, 475, 23, C.cream, 240, 'left');
    this.labels.kills = this.label(this.node, '击破  0', 236, 415, 20, C.gold, 160);
    this.labels.shield = this.label(this.node, '护盾 0/24', 195, 475, 23, '#C9BCEA', 234);
    this.labels.stage = this.label(this.node, '', -310, 415, 20, C.teal, 430, 'left');
    this.labels.build = this.label(this.node, '', -310, 390, 18, C.gold, 430, 'left');
    this.labels.milestone = this.label(this.node, '', -310, 366, 17, C.muted, 430, 'left');
    this.labels.power = this.label(this.node, '', -310, 345, 19, C.teal, 620, 'left');
    this.labels.form = this.label(this.node, '', 0, -442, 25, C.cream, 620);
    this.labels.hint = this.label(this.node, '', -307, -484, 21, C.muted, 425, 'left');
    this.labels.reorder = this.label(this.node, '调整车序', 222, -483, 27, C.teal, 190, 'center','display');
    this.labels.footer = this.label(this.node, '声音 开', -270, -577, 21, C.muted, 162);
    this.labels.motion = this.label(this.node, '镜头 开', -90, -577, 21, C.muted, 162);
    this.labels.speed = this.label(this.node, '倍速 ×1', 90, -577, 21, C.gold, 162);
    this.labels.pause = this.label(this.node, '暂停 Ⅱ', 270, -577, 21, C.cream, 162);
    this.labels.numbers = this.label(this.node, '跳字 开', 144, -577, 21, C.gold, 136);
    ['footer','motion','speed','numbers','pause'].forEach((key,i)=>{
      this.labels[key].node.setPosition(-288+i*144,-577,0);
      this.labels[key].node.getComponent(UITransform)!.setContentSize(136,40);
    });
    this.labels.toast = this.label(this.node, '', 0, 375, 24, C.gold, 680);
    this.labels.windLesson = this.label(this.node, '', 0, 309, 24, C.teal, 620);
    this.labels.chain = this.label(this.node, '', 245, 305, 28, C.gold, 205);
    this.labels.boss = this.label(this.node, '', 0, 385, 19, C.red, 570);
    this.overlayNode = new Node('Panels'); this.overlayNode.layer=Layers.Enum.UI_2D; this.node.addChild(this.overlayNode);
    this.overlayNode.addComponent(UITransform).setContentSize(720,1280);
    this.overlay = this.overlayNode.addComponent(Graphics);
    this.dragGraphics = this.layer('Carriage drag');
    this.dragLabel = this.label(this.dragGraphics.node, '', 0, 0, 21, C.cream, 300);
    this.dragChanges = [0, 1].map(i => this.label(this.dragGraphics.node, '', -267, -55 - i * 58, 19, i ? C.red : C.teal, 534, 'left'));
    this.node.on(Node.EventType.TOUCH_START, this.touchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.touchMove, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
    this.node.on(Node.EventType.TOUCH_END, this.touch, this);
    game.on(EngineGame.EVENT_HIDE, this.hide, this);
    try { const saved = globalThis.localStorage?.getItem('doomsday-settings'); if(saved){const v=JSON.parse(saved);this.sound=v.sound!==false;this.lowMotion=!!v.lowMotion;this.showDamage=v.showDamage!==false;} } catch {}
    try {
      const current=globalThis.localStorage?.getItem('doomsday-recipes-v04');
      const saved=JSON.parse(current??globalThis.localStorage?.getItem('doomsday-recipes-v03')??'[]');
      if(Array.isArray(saved))for(const oldId of saved){
        // The old reverse wind/fire recipe is now the single order-independent recipe.
        const id=current===null?(oldId==='fan-flame'?'flame-fan':oldId==='flame-fan'?null:oldId):oldId;
        if(RECIPES.some(r=>r.id===id))this.knownRecipes.add(id);
      }
      globalThis.localStorage?.setItem('doomsday-recipes-v04',JSON.stringify(Array.from(this.knownRecipes)));
    }catch{}
    try{this.garage=readGarage(globalThis.localStorage?.getItem('doomsday-garage-v1')||null,Array.from(this.knownRecipes));}catch{}
    this.loadLastLightArt();
    for(const name of ['title','body'])resources.load(`fonts/afterglow-modern-${name}`,Font,(error,font)=>{
      if(error){console.error(`Afterglow ${name} font failed`,error);return;}if(!this.isValid)return;
      if(name==='title')this.titleFont=font;else this.bodyFont=font;
      for(const label of this.node.getComponentsInChildren(Label)){
        if((name==='title')===(label.node.name==='Display ink')){label.font=font;label.useSystemFont=false;}
      }
      this.state='';
    });
    resources.load(DAMAGE_ATLAS_PATH,SpriteFrame,(error,frame)=>{
      if(!error)this.digitFrames=Array.from({length:60},(_,index)=>{
        const r=damageGlyphRect(Math.floor(index/12),index%12),glyph=new SpriteFrame();
        glyph.reset({texture:frame.texture,rect:new Rect(r.x,r.y,r.width,r.height)});
        glyph.packable=false;this.slicedFrames.push(glyph);return glyph;
      });
    });
    resources.load('art/afterglow-hud-veil-v1/spriteFrame',SpriteFrame,(error,frame)=>{
      if(error||!this.isValid)return;
      this.hudVeil=this.sprite('Navigation veil',frame,720,256,this.node);
      this.hudVeil.setPosition(0,512,0);this.hudVeil.setSiblingIndex(this.hud.node.getSiblingIndex());
    });
    // Read-only diagnostic snapshot for smoke checks, without exposing state mutation.
    (globalThis as any).__doomsday = { snapshot: () => ({ phase:this.model.phase,
      time:this.model.time,wave:this.model.wave,entranceRemaining:this.entranceRemaining,cameraY:this.worldNode.position.y, hp:this.model.hp, kills:this.model.kills, enemies:this.model.enemies.length,
      vortices:this.model.vortices.length, shield:this.model.shieldHp,maxShield:this.model.maxShield, seed:this.model.initialSeed, fps:this.fps, speed:this.debugSpeed,
      slots:this.model.slots.map((c,i)=>c?{id:c.id,type:c.type,level:c.level,mods:{...c.mods},range:this.model.getCarRange(i),angle:c.angle}:null),
      links:this.model.links.map(l=>({index:l.index,id:l.recipe.id,driver:l.driver,support:l.support})),pendingCar:this.model.pendingCar,
      offers:this.model.offers.slice(),scrap:this.model.scrap,nextScrap:this.model.nextScrap,supplyCount:this.model.supplyCount,supplyWait:this.model.supplyWait,
      stationChoices:this.model.stationChoices,stationCount:this.model.stationCount,route:this.model.route,engine:this.model.engineState,world:this.model.worldState,terrainCount:this.terrainFrames.size,engineArtCount:this.engineFrames.size,garage:this.garage,garageOpen:this.garageOpen,
      knownRecipes:Array.from(this.knownRecipes),linkLevel:this.model.linkLevel,buildProgression:this.model.buildProgression,buildPower:this.model.buildPower,
      selectedSlot:this.selectedSlot,replacementConfirmed:this.replacementConfirmed,
      assemblyRemaining:this.assemblyRemaining,workshopMotion:Array.from(this.workshopPositions.entries()).map(([key,p])=>({key,x:p.x,y:p.y,targetX:p.targetX,targetY:p.targetY})),
      openingFeedback:{feed:this.firstWindFeed,chainBest:this.windChainBest,text:this.windLessonText,life:this.windLessonLife},
      maxHp:this.model.maxHp,boss:this.model.boss?{hp:this.model.boss.hp,maxHp:this.model.boss.maxHp}:null,
      bossCharge:this.model.bossCharge,endReason:this.model.endReason,damageNumbers:this.damageNumbers.items.map(n=>({amount:n.amount,incoming:n.incoming,shield:n.shield})),showDamage:this.showDamage,
      attackStats:this.model.slots.map((_,i)=>this.model.getCarAttackStats(i)),mainDamageSource:this.model.mainDamageSource,
       art:{style:'lastlight',paper:!!this.paperArt,flow:!!this.flowMaterial,enemyKinds:Array.from(this.enemyFrames.keys()),menu:!!this.menuFrame,ground:!!this.groundArt,unitMaterial:!!this.unitMaterial,fx:this.fxFrames.length,flame:this.flameFrames.length,mods:this.modFrames.size,activeFx:this.fxUsed,locomotive:!!this.loco,headVisible:!!this.loco?.active,zombie:!!this.zombieFrame,hull:!!this.hullFrame,weapons:Array.from(this.weaponFrames.keys()) },
      effects:{particles:this.particles.length,defeated:this.defeated.length,chain:this.chain,
        feeds:this.supportEffects.filter(e=>e.type==='feed').map(e=>({fromY:e.y,toY:e.y+e.dy,life:e.life}))}, events:this.model.events.slice() }) };
  }
  onDestroy() {
    this.node.off(Node.EventType.TOUCH_START, this.touchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.touchMove, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
    game.off(EngineGame.EVENT_HIDE, this.hide, this);
    this.node.off(Node.EventType.TOUCH_END, this.touch, this);
    this.audio?.close?.(); delete (globalThis as any).__doomsday;
    this.fireMaterial?.destroy();
    this.unitMaterial?.destroy();
    this.chassisMaterial?.destroy();
    this.flowMaterial?.destroy();
    for(const frame of this.slicedFrames)frame.destroy();
  }
  private hide() {
    this.clearDrag(); this.model.pause();this.flameUntil=0;
    if(this.flameBed)this.flameBed.gain.gain.setTargetAtTime(0,this.audio.currentTime,.02);
  }
  private group(name:string,parent:Node) {const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n;}
  private layer(name: string, parent=this.node) { const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(720,1280);return n.addComponent(Graphics); }
  private label(parent: Node, text: string, x: number, y: number, size: number, color: string, width=600, align='center',font:'display'|'body'='body') {
    if(font==='display'&&/[Ⅱ→↔≥▶]/.test(text))font='body';
    const n=new Node(font==='display'?'Display ink':'Body ink');n.layer=Layers.Enum.UI_2D; parent.addChild(n); const t=n.addComponent(UITransform);t.setContentSize(width,size*2.7);
    if(align==='left')t.setAnchorPoint(0,.5);
    n.setPosition(x,y,0);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size*1.35;l.color=new Color(color);
    // Cocos expects one canvas font family, not a CSS fallback list.
    l.fontFamily='Microsoft YaHei';l.isBold=false;
    const loaded=font==='display'?this.titleFont:this.bodyFont;
    if(loaded){l.font=loaded;l.useSystemFont=false;}
    l.spacingX=font==='display'?.8:.2;l.enableShadow=true;
    l.shadowColor=new Color(17,22,38,110);l.shadowOffset=new Vec2(0,-1);l.shadowBlur=1;
    l.enableOutline=false;
    l.horizontalAlign=align==='left'?Label.HorizontalAlign.LEFT:Label.HorizontalAlign.CENTER;
    l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;return l;
  }
  private sprite(name: string, frame: SpriteFrame, w: number, h: number, parent: Node) {
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);
    const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=frame;
    if(this.unitFrames.has(frame)&&this.unitMaterial)s.customMaterial=this.unitMaterial;
    const pivot=this.unitPivots.get(frame);if(pivot)n.getComponent(UITransform)!.setAnchorPoint(pivot[0],pivot[1]);
    return n;
  }
  private atlasCell(atlas:SpriteFrame,index:number) {
    const texture=atlas.texture,w=texture.width/4,h=texture.height/2;
    const x=Math.round(index%4*w),y=Math.round(Math.floor(index/4)*h);
    const frame=new SpriteFrame();
    frame.reset({texture,rect:new Rect(x,y,Math.round((index%4+1)*w)-x,Math.round((Math.floor(index/4)+1)*h)-y)});
    frame.packable=false;this.slicedFrames.push(frame);return frame;
  }
  private cropArt(atlas:SpriteFrame,rects:number[][]) {
    return rects.map(([x,y,w,h])=>{const frame=new SpriteFrame();frame.reset({texture:atlas.texture,rect:new Rect(x,y,w,h)});frame.packable=false;this.slicedFrames.push(frame);return frame;});
  }
  private loadLastLightArt() {
    resources.load('afterglow-chassis-key',EffectAsset,(err,effect)=>{
      if(err||!this.isValid)return;
      this.chassisMaterial=new Material();this.chassisMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});
      this.unitMaterial=new Material();this.unitMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});this.state='';
    });
    resources.load('art/lastlight-city-v1/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err||!this.isValid)return;
      for(const id of WORLD_IDS)this.terrainFrames.set(id,frame);
      this.groundArt=this.sprite('The last light — flooded city',frame,720,1280,this.node);this.groundArt.setSiblingIndex(0);
      this.menuFrame=frame;this.menuArt=this.sprite('Last light title scene',frame,720,1280,this.node);this.menuArt.setSiblingIndex(this.hud.node.getSiblingIndex());
      this.paperArt=this.sprite('Ink city behind the ticket',frame,720,1280,this.node);this.paperArt.setSiblingIndex(this.hud.node.getSiblingIndex());this.paperArt.active=false;
      this.state='';
    });
    resources.load('art/lastlight-enemies-v1/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err||!this.isValid)return;
      const rects=[[103,17,218,386],[443,92,317,293],[883,16,296,386],[28,405,428,426],[503,547,234,255],[850,449,370,373],[95,839,247,387],[509,813,250,423],[879,830,304,405]];
      this.cropArt(atlas,rects).forEach((frame,i)=>this.enemyFrames.set(i,frame));
      this.zombieFrame=this.enemyFrames.get(0)!;this.lastLightEnemyReady=true;this.enemyAtlasReady=true;
      for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();this.state='';
    });
    resources.load('art/lastlight-train-v1/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err||!this.isValid)return;
      const frames=this.cropArt(atlas,[[71,15,171,298],[385,15,171,298],[698,15,171,298],[1029,76,136,200],[80,337,154,281],[333,396,275,212],[719,338,129,283],[999,380,196,228],[88,647,138,260],[396,666,149,238],[729,644,110,268],[1050,622,94,311],[87,943,139,283],[380,976,181,213],[738,973,91,241],[1003,989,189,199]]);
      for(const frame of frames)this.unitFrames.add(frame);
      this.unitPivots.set(frames[4],[.5,.32]);this.unitPivots.set(frames[6],[.5,.32]);this.unitPivots.set(frames[11],[.5,.25]);
      (['dawn','storm','haven'] as EngineId[]).forEach((id,i)=>{this.engineFrames.set(id,frames[i]);this.chassisFrames.set(id,frames[3]);});
      this.hullFrame=frames[3];
      (['cannon','fan','flame','tesla','cryo','shield','repair','rail','prism','acid'] as CarType[]).forEach((type,i)=>{this.weaponFrames.set(type,frames[i+4]);this.carIcons.set(type,frames[i+4]);});
      const mods:Record<string,CarType>={caliber:'cannon',fuel:'flame',pressure:'fan',voltage:'tesla',coolant:'cryo',resonance:'tesla',railpower:'rail',prismfocus:'prism',acidpotency:'acid',rapid:'cannon',reach:'rail',surge:'tesla',lanes:'rail',scatter:'cannon',burst:'cannon',repairkit:'repair',capacitor:'shield',repair:'repair'};
      for(const [id,type]of Object.entries(mods))this.modFrames.set(id as ModId|'repair',this.weaponFrames.get(type)!);
      this.loco=this.sprite('Sunlight locomotive',frames[0],110,190,this.trainLayer);
      this.lastLightReady=true;this.state='';
    });
    resources.load('art/lastlight-ui-v1/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err||!this.isValid)return;
      this.lastLightUi=this.cropArt(atlas,[[38,116,690,280],[808,138,694,240],[23,485,727,470],[773,635,733,166]]);
      this.lastLightTitle=this.sprite('末日列车 — THE LAST LIGHT',this.lastLightUi[0],270,180,this.node);this.lastLightTitle.setSiblingIndex(this.overlayNode.getSiblingIndex());
      this.lastLightTicket=this.sprite('Railway ticket HUD',this.lastLightUi[1],720,300,this.node);this.lastLightTicket.setSiblingIndex(this.hud.node.getSiblingIndex());this.state='';
      this.lastLightPanel=this.sprite('Printed railway dispatch',this.lastLightUi[2],628,900,this.node);this.lastLightPanel.setPosition(0,-5,0);this.lastLightPanel.setSiblingIndex(this.overlayNode.getSiblingIndex());this.lastLightPanel.active=false;
      this.lastLightReorder=this.sprite('Vermilion formation ticket',this.lastLightUi[3],390,66,this.node);this.lastLightReorder.setPosition(0,-511,0);this.lastLightReorder.setSiblingIndex(this.hud.node.getSiblingIndex());this.lastLightReorder.active=false;
    });
    resources.load('art/afterglow-fx-v07/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err||!this.isValid)return;this.fxFrames=Array.from({length:8},(_,i)=>this.atlasCell(frame,i));
    });
    resources.load('art/afterglow-flame-v08/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err||!this.isValid)return;this.flameFrames=this.cropArt(frame,[[20,170,360,540],[392,170,416,540],[806,170,570,540],[1390,170,370,540]]);
    });
  }
  private loadAfterglowArt() {
    resources.load('art/afterglow-mods-v07/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Modifier artwork failed',err);return;}if(!this.isValid)return;
      const frames=this.stripFrames(frame,6,3),ids:(ModId|'repair')[]=['caliber','fuel','pressure','voltage','coolant','resonance','railpower','prismfocus','acidpotency','rapid','reach','surge','lanes','scatter','burst','repairkit','capacitor','repair'];
      ids.forEach((id,i)=>this.modFrames.set(id,frames[i]));this.state='';
    });
    resources.load('art/afterglow-support-top-v08/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Support artwork failed',err);return;}if(!this.isValid)return;
      const frames=this.stripFrames(frame,2);
      // Roof-view equipment shares the same camera and green-screen material
      // as the other combat modules; side-view concepts stay in the art archive.
      (['repair','shield'] as CarType[]).forEach((type,i)=>{this.unitFrames.add(frames[i]);this.weaponFrames.set(type,frames[i]);});this.state='';
    });
    resources.load('art/afterglow-flame-v08/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Flame artwork failed',err);return;}if(!this.isValid)return;
      // Generated stages have unequal widths. Crop each full silhouette and
      // exclude the sheet guides instead of truncating them with equal cells.
      this.flameFrames=[[20,170,360,540],[392,170,416,540],[806,170,570,540],[1390,170,370,540]].map(([x,y,w,h])=>{
        const cell=new SpriteFrame(),texture=frame.texture;
        cell.reset({texture,rect:new Rect(x,y,w,h)});cell.packable=false;this.slicedFrames.push(cell);return cell;
      });
    });
    resources.load('art/afterglow-expansion-v06/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Expansion artwork failed',err);return;}if(!this.isValid)return;
      this.expansionAtlas=frame;this.finishExpansionArt();
    });
    resources.load('art/afterglow-paper-v2/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Painted paper failed',err);return;}if(!this.isValid)return;
      this.paperArt=this.sprite('Gouache panel ground',frame,720,1280,this.node);
      this.paperArt.setSiblingIndex(this.hud.node.getSiblingIndex());this.paperArt.active=false;this.state='';
    });
    resources.load('art/afterglow-workshop-v1/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Workshop artwork failed',err);return;}if(!this.isValid)return;
      this.workshopArt=this.sprite('Painted railway workshop',frame,720,1280,this.node);
      this.workshopArt.setSiblingIndex(this.hud.node.getSiblingIndex());this.workshopArt.active=false;this.state='';
    });
    resources.load('art/afterglow-station-v1/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Station artwork failed',err);return;}if(!this.isValid)return;
      this.stationArt=this.sprite('Painted railway station',frame,720,1280,this.node);
      this.stationArt.setSiblingIndex(this.hud.node.getSiblingIndex());this.stationArt.active=false;this.state='';
    });
    resources.load('afterglow-flow',EffectAsset,(err,effect)=>{
      if(err){console.error('Flow material failed',err);return;}if(!this.isValid)return;
      this.flowMaterial=new Material();this.flowMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});
      for(const n of this.fxPool)n.getComponent(Sprite)!.customMaterial=this.flowMaterial;
    });
    resources.load('art/afterglow-menu/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Menu artwork failed',err);return;}if(!this.isValid)return;
      this.menuFrame=frame;
      this.menuArt=this.sprite('Afterglow menu',frame,720,1280,this.node);
      this.menuArt.setSiblingIndex(this.overlayNode.getSiblingIndex());this.menuArt.active=false;this.state='';
    });
    for(const id of WORLD_IDS)resources.load(`art/${WORLDS[id].art}/spriteFrame`,SpriteFrame,(err,frame)=>{
      if(err){console.error(`${id} terrain artwork failed`,err);return;}if(!this.isValid)return;
      this.terrainFrames.set(id,frame);
      if(id==='city'){
        this.groundArt=this.sprite('Painted ground',frame,720,1080,this.node);this.groundArt.setSiblingIndex(0);
        this.groundLoop=this.sprite('Passing terrain',frame,720,1080,this.node);this.groundLoop.setSiblingIndex(0);
      }
    });
    resources.load('art/afterglow-locomotives-v1/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err){console.error('Locomotive artwork failed',err);return;}if(!this.isValid)return;
      const regions=[[136,5,312,1008],[614,8,310,1008],[1066,7,376,1012]];
      (['dawn','storm','haven'] as EngineId[]).forEach((id,index)=>{
        const [x,y,w,h]=regions[index],frame=new SpriteFrame();frame.reset({texture:atlas.texture,rect:new Rect(x,y,w,h)});
        frame.packable=false;this.slicedFrames.push(frame);this.engineFrames.set(id,frame);
      });this.state='';
    });
    resources.load('afterglow-chassis-key',EffectAsset,(err,effect)=>{
      if(err||!this.isValid)return;
      this.chassisMaterial=new Material();this.chassisMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});
      this.state='';
    });
    resources.load('art/afterglow-chassis-v1/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err||!this.isValid)return;
      const regions=[[49,170,462,690],[537,170,462,690],[1025,170,462,690]];
      (['dawn','storm','haven'] as EngineId[]).forEach((id,index)=>{
        const [x,y,w,h]=regions[index],frame=new SpriteFrame();frame.reset({texture:atlas.texture,rect:new Rect(x,y,w,h)});
        frame.packable=false;this.slicedFrames.push(frame);this.chassisFrames.set(id,frame);
      });this.state='';
    });
    resources.load('art/afterglow-enemies-v2/spriteFrame',SpriteFrame,(err,atlas)=>{
      if(err){console.error('Enemy artwork failed',err);return;}if(!this.isValid)return;
      const regions=[[59,79,315,279],[501,15,249,387],[862,37,366,354],[13,409,414,429],[465,455,327,331],[865,463,359,329],[43,893,346,317],[445,836,365,382],[861,834,366,390]];
      regions.forEach(([x,y,w,h],kind)=>{
        const frame=new SpriteFrame();frame.reset({texture:atlas.texture,rect:new Rect(x,y,w,h)});frame.packable=false;
        this.slicedFrames.push(frame);this.enemyFrames.set(kind,frame);
      });
      this.enemyAtlasReady=true;for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();this.state='';
    });
    resources.load('art/afterglow-units-v06/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Unit artwork failed',err);return;}if(!this.isValid)return;
      this.unitAtlas=frame;this.finishUnitArt();
    });
    resources.load('afterglow-key',EffectAsset,(err,effect)=>{
      if(err){console.error('Unit material failed',err);return;}if(!this.isValid)return;
      this.unitMaterial=new Material();this.unitMaterial.initialize({effectAsset:effect,defines:{USE_TEXTURE:true}});this.finishUnitArt();this.finishExpansionArt();
      for(const parent of [this.trainLayer,this.overlayNode])for(const n of parent.children){const s=n.getComponent(Sprite);if(s?.spriteFrame&&this.unitFrames.has(s.spriteFrame))s.customMaterial=this.unitMaterial;}
    });
    resources.load('art/afterglow-fx-v07/spriteFrame',SpriteFrame,(err,frame)=>{
      if(err){console.error('Effect artwork failed',err);return;}if(!this.isValid)return;
      this.fxFrames=Array.from({length:8},(_,i)=>this.atlasCell(frame,i));this.state='';
    });
  }
  private finishUnitArt() {
    if(!this.unitAtlas||!this.unitMaterial||this.hullFrame)return;
    const frames=Array.from({length:8},(_,i)=>this.atlasCell(this.unitAtlas!,i));
    for(const frame of frames)this.unitFrames.add(frame);
    const pivots:[number,number][]=[[.54,.47],[.44,.435],[.48,.435],[.34,.435],[.535,.57],[.485,.55],[.425,.605],[.33,.57]];
    frames.forEach((frame,i)=>this.unitPivots.set(frame,pivots[i]));
    this.hullFrame=frames[0];
    (['cannon','fan','flame','tesla','cryo'] as CarType[]).forEach((type,i)=>this.weaponFrames.set(type,frames[i+1]));
    this.zombieFrame=frames[6];
    this.loco=this.sprite('Locomotive',frames[7],124,155,this.trainLayer);this.loco.angle=180;this.state='';
  }
  private finishExpansionArt() {
    if(!this.expansionAtlas||!this.unitMaterial||this.weaponFrames.has('rail'))return;
    const frames=Array.from({length:8},(_,i)=>this.atlasCell(this.expansionAtlas!,i));
    for(const frame of frames)this.unitFrames.add(frame);
    this.unitPivots.set(frames[0],[241/444,1-301/444]);
    (['rail','prism','acid'] as CarType[]).forEach((type,i)=>this.weaponFrames.set(type,frames[i]));
    if(!this.enemyAtlasReady){
      this.enemyFrames.set(0,frames[3]);this.enemyFrames.set(1,frames[3]);
      this.enemyFrames.set(6,frames[4]);this.enemyFrames.set(7,frames[5]);this.enemyFrames.set(8,frames[6]);
      for(const kind of [2,3,4,5])this.enemyFrames.set(kind,frames[7]);
    }
    for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();this.state='';
  }
  /** Reuse effect sprites; their black source canvas vanishes through additive blending. */
  private stripFrames(atlas:SpriteFrame,columns:number,rows=1) {
    return Array.from({length:columns*rows},(_,i)=>{const frame=new SpriteFrame(),texture=atlas.texture;
      const column=i%columns,row=Math.floor(i/columns),x=Math.round(texture.width*column/columns),right=Math.round(texture.width*(column+1)/columns);
      const y=Math.round(texture.height*row/rows),bottom=Math.round(texture.height*(row+1)/rows);
      frame.reset({texture,rect:new Rect(x,y,right-x,bottom-y)});frame.packable=false;this.slicedFrames.push(frame);return frame;});
  }
  private artEffect(index:number,x:number,y:number,w:number,h=w,angle=0,alpha=1,tint='#FFFFFF') {
    const frame=index>=8?this.flameFrames[index-8]:this.fxFrames[index];if(!frame||this.fxUsed>=100)return false;
    // v07 leaves safe black gutters around each brush shape; preserve its on-field footprint.
    if(index<8){w*=1.35;h*=1.35;}
    let n=this.fxPool[this.fxUsed];
    if(!n){n=this.sprite('Painted effect',frame,w,h,this.vortexLayer);if(this.flowMaterial)n.getComponent(Sprite)!.customMaterial=this.flowMaterial;else this.emission(n.getComponent(Sprite)!);this.fxPool.push(n);}
    this.fxUsed++;n.active=true;n.setPosition(x,y,0);n.angle=angle;n.setScale(1,1,1);
    n.getComponent(UITransform)!.setContentSize(w,h);
    const sprite=n.getComponent(Sprite)!;sprite.spriteFrame=frame;
    if(index>=8||!this.flowMaterial)this.emission(sprite);else sprite.customMaterial=this.flowMaterial;
    const color=new Color(tint);color.a=Math.round(255*Math.max(0,Math.min(1,alpha)));sprite.color=color;
    return true;
  }
  private emission(sprite:Sprite) {
    if(!this.fireMaterial.passes.length){
      const base=sprite.getSharedMaterial(0);
      if(!base)throw new Error('Fire sprite has no base material');
      // Copy the actual engine sprite effect rather than relying on its registry name.
      this.fireMaterial.copy(base,{states:{blendState:{targets:[{
        blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,
        blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE,
      }]}}});
    }
    sprite.customMaterial=this.fireMaterial;
  }
  private rect(g:Graphics,x:number,y:number,w:number,h:number,color:string,r=0) {
    g.fillColor=new Color(color);if(r)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill();
  }
  private circle(g:Graphics,x:number,y:number,r:number,color:string) {g.fillColor=new Color(color);g.circle(x,y,r);g.fill();}
  /** Quiet interface planes keep detailed handpainted scenery in the foreground. */
  private paintRect(g:Graphics,x:number,y:number,w:number,h:number,color:string) {
    if(w<=0||h<=0)return;
    this.rect(g,x,y,w,h,color,Math.min(6,h*.16));
  }
  private line(g:Graphics,points:number[],color:string,width=2) {
    g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();
  }
  private begin() {
    this.finishRun();this.garageOpen=false;this.runRecorded=false;this.engineFlash=0;
    this.buildCelebration=0;this.celebratedMilestones.clear();
    this.assemblyRemaining=0;this.assemblyDepart=false;this.workshopPositions.clear();
    this.firstWindFeed=false;this.windLessonLife=0;this.windChainBest=0;this.windLessonText='';
    this.damageNumbers.clear();this.flameUntil=0;this.scrapPulse=0;
    this.unlockAudio();this.model.start(this.seed++,true,this.garage.loadout);this.particles=[];this.chain=0;this.chainLife=0;
    this.entranceRemaining=1;
    this.visualTime=0;this.shake=0;this.emberClock=0;
    this.supportEffects=[];this.selectedSlot=-1;this.atlas=false;this.newRecipes.clear();
    for(const n of this.enemySprites.values())n.destroy();this.enemySprites.clear();
    for(const n of this.fxPool)n.active=false;this.fxUsed=0;
    for(const n of this.carArt.values())n.destroy();this.carArt.clear();
    for(const n of this.weaponSprites.values())n.destroy();this.weaponSprites.clear();
    for(const d of this.defeated)d.node.destroy();this.defeated=[];
    for(const n of this.vortexSprites.values())n.destroy();this.vortexSprites.clear();
    this.toast('击破敌人，收集改装废料');this.tone(180,.15);
  }
  private saveGarage() {
    try{globalThis.localStorage?.setItem('doomsday-garage-v1',JSON.stringify(this.garage));}catch{}
  }
  private finishRun() {
    if(this.runRecorded||this.model.time<=0)return;
    this.garage=recordRun(this.garage,{time:this.model.time,wave:this.model.wave,kills:this.model.kills,
      bosses:this.model.buildProgression.metrics.bossKills,recipes:Array.from(this.knownRecipes)});
    this.runRecorded=true;this.saveGarage();
  }
  private openWorkshop(slot=-1) {
    if(this.model.openWorkshop()){this.selectedSlot=slot;this.atlas=false;}
  }
  private canDrag() { return this.model.phase==='workshop'&&!this.model.pendingCar&&!this.atlas&&this.assemblyRemaining===0; }
  private touchPoint(event:EventTouch) {
    const p=event.getUILocation();
    return this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
  }
  private touchStart(event:EventTouch) {
    if(!this.canDrag())return;
    const p=this.touchPoint(event),slot=workshopSlotAt(p.x,p.y,this.model.slots.length);
    if(slot>=0&&this.model.slots[slot])this.slotDrag.start(event.getID(),slot,p.x,p.y);
  }
  private touchMove(event:EventTouch) {
    const p=this.touchPoint(event);this.slotDrag.move(event.getID(),p.x,p.y);
  }
  private touchCancel(event:EventTouch) { if(event.getID()===this.slotDrag.pointer)this.clearDrag(); }
  private clearDrag() {
    this.slotDrag.reset();this.dragGraphics?.clear();
    if(this.dragLabel)this.dragLabel.string='';
    for(const label of this.dragChanges)label.string='';
    this.dragIcon?.destroy();this.dragIcon=null;
  }
  private updateDrag(dt:number) {
    const d=this.slotDrag,g=this.dragGraphics;
    if(d.pointer<0)return;
    if(!this.canDrag()){this.clearDrag();return;}
    if(d.advance(dt)){
      this.selectedSlot=d.source;this.tone(620,.06);
      const car=this.model.slots[d.source]!;
      const frame=this.weaponFrames.get(car.type)||this.carIcons.get(car.type);
      if(frame){this.dragIcon=this.sprite('Lifted carriage',frame,86,86,g.node);this.dragIcon.getComponent(UITransform)!.setAnchorPoint(.5,.5);if(car.type==='cannon'||car.type==='flame')this.dragIcon.angle=90;}
    }
    g.clear();
    if(d.cancelled)return;
    const sourceX=(d.source-(this.model.slots.length-1)/2)*610/this.model.slots.length;
    if(!d.active){this.line(g,[sourceX-42,235,sourceX-42+84*Math.min(1,d.elapsed/.35),235],C.teal,4);return;}
    const target=workshopSlotAt(d.x,d.y,this.model.slots.length);
    if(target>=0){
      const spacing=610/this.model.slots.length,x=(target-(this.model.slots.length-1)/2)*spacing;
      this.rect(g,x-spacing/2+5,42,spacing-10,197,'#A8DADE28',8);
      g.strokeColor=new Color(C.teal);g.lineWidth=3;g.roundRect(x-spacing/2+5,42,spacing-10,197,8);g.stroke();
    }
    const x=Math.max(-290,Math.min(290,d.x)),y=Math.max(100,Math.min(175,d.y+35));
    this.rect(g,x-57,y-56,114,113,'#123033ED',12);
    if(this.dragIcon)this.dragIcon.setPosition(x,y+5,0);
    else this.drawCarModule(g,this.model.slots[d.source]!.type,x,y,.7,Math.PI/2);
    this.dragLabel.string=target<0?'移出槽位 · 松手取消':target===d.source?'拖到另一槽位':this.model.slots[target]?`松手交换至 ${target+1} 号位`:`松手移至 ${target+1} 号位`;
    this.rect(g,-284,-263,568,244,'#123033FA',6);
    this.dragLabel.node.setPosition(0,-211,0);
    if(target>=0&&target!==d.source){
      const before=this.model.slots.map(car=>car?.type??null),after=before.slice();
      [after[d.source],after[target]]=[after[target],after[d.source]];
      const changes=linkChanges(before,after,this.knownRecipes);
      this.dragChanges[0].string=`新增：${changes.added.join('、')||'无'}`;
      this.dragChanges[1].string=`失去：${changes.removed.join('、')||'无'}`;
    }else for(const label of this.dragChanges)label.string='';
  }
  private touch(event: EventTouch) {
    if(this.assemblyRemaining>0)return;
    const d=this.slotDrag;
    if(d.pointer>=0){
      if(event.getID()!==d.pointer)return;
      this.touchMove(event);
      const consumed=d.active||d.cancelled;
      if(d.active&&this.canDrag()){
        const target=workshopSlotAt(d.x,d.y,this.model.slots.length);
        if(target>=0&&target!==d.source&&this.model.swapSlots(d.source,target)){this.selectedSlot=-1;this.tone(750,.065);}
      }
      this.clearDrag();
      if(consumed)return;
    }
    this.unlockAudio();
    const p=event.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    for(let i=this.hitAreas.length-1;i>=0;i--){const a=this.hitAreas[i];if(Math.abs(local.x-a.x)<=a.w/2&&Math.abs(local.y-a.y)<=a.h/2){a.action();this.tone(470,.045);return;}}
    if(this.model.phase==='combat'&&local.y>=-540&&Math.abs(local.x)<65){
      const worldY=local.y-this.worldNode.position.y;
      const slot=this.slotY.findIndex(y=>Math.abs(y-worldY)<52);
      if(slot>=0){this.openWorkshop(slot);return;}
    }
    if(local.y < -582) {
      if(local.x < -216) this.sound=!this.sound;
      else if(local.x < -72) this.lowMotion=!this.lowMotion;
      else if(local.x < 72) this.debugSpeed=this.debugSpeed===4?1:this.debugSpeed*2;
      else if(local.x < 216) {this.showDamage=!this.showDamage;this.damageNumbers.clear();}
      else { if(this.model.phase==='paused')this.model.resume();else this.model.pause(); }
      try{globalThis.localStorage?.setItem('doomsday-settings',JSON.stringify({sound:this.sound,lowMotion:this.lowMotion,showDamage:this.showDamage}));}catch{}
    }
  }
  private unlockAudio() {
    try { const AC=(globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if(!this.audio&&AC)this.audio=new AC();this.audio?.resume?.(); }catch{}
  }
  private formationSound() {
    if(!this.sound||!this.audio)return;
    const ctx=this.audio,now=ctx.currentTime;
    try{for(const [i,freq]of [261.63,392,523.25].entries()){
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=now+i*.07;
      oscillator.type='triangle';oscillator.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.025);
      gain.gain.exponentialRampToValueAtTime(.001,start+.55);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.56);
    }}catch{}
  }
  private tone(freq:number, length:number, kind='sine') {
    if(!this.sound||!this.audio)return;
    const now=this.audio.currentTime;
    if(now-(this.soundTimes.get('tone')??-10)<.07)return;
    this.soundTimes.set('tone',now);
    try {const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,this.audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.45),this.audio.currentTime+length);
      g.gain.setValueAtTime(.045,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+length);
      o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+length);}catch{}
  }
  private weaponSound(kind: 'cannon'|'pierce'|'parallel'|'ice'|'electric'|'blast'|'flame') {
    if(!this.sound||!this.audio)return;
    const ctx=this.audio,now=ctx.currentTime;
    if(kind==='flame')this.flameUntil=now+.22;
    if(now-(this.soundTimes.get(kind)??-10)<(kind==='electric'?.12:.18))return;
    this.soundTimes.set(kind,now);
    try {
      if(!this.noiseBuffer){
        this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
        const samples=this.noiseBuffer.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      }
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=this.noiseBuffer;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
      if(kind==='flame'){
        if(this.flameBed){source.disconnect();filter.disconnect();gain.disconnect();return;}
        source.loop=true;filter.type='lowpass';filter.frequency.value=550;gain.gain.value=0;
        source.start();this.flameBed={source,filter,gain};return;
      }
      const ice=kind==='ice',electric=kind==='electric',pierce=kind==='pierce',parallel=kind==='parallel';
      const duration=ice?.19:electric?.075:pierce?.16:parallel?.14:.2;
      filter.type=ice?'highpass':electric||pierce?'bandpass':'lowpass';
      filter.frequency.setValueAtTime(ice?2600:electric?1700:pierce?1300:parallel?850:380,now);
      filter.Q.value=electric?5:pierce?2:.7;
      gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(ice?.055:electric?.04:.075,now+.006);
      gain.gain.exponentialRampToValueAtTime(.001,now+duration);
      source.start(now);source.stop(now+duration);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
      if(kind==='cannon'||kind==='blast'||parallel)this.tone(parallel?155:kind==='blast'?65:95,duration,'triangle');
    }catch{}
  }
  private toast(text:string) {this.toastText=text;this.toastLife=2.2;}
  update(dt:number) {
    if(this.assemblyRemaining>0 && this.model.phase==='workshop'){
      this.assemblyRemaining=Math.max(0,this.assemblyRemaining-Math.min(.1,Math.max(0,dt)));
      if(this.assemblyRemaining===0){if(this.assemblyDepart)this.model.resumeWorkshop();this.assemblyDepart=false;this.state='';}
    }
    this.updateDrag(dt);
    const before=this.model.phase,realDelta=Math.min(Math.max(dt,0),.1);
    const entering=this.entranceRemaining>0;
    if(entering&&before==='combat'){
      this.entranceRemaining=Math.max(0,this.entranceRemaining-realDelta*this.debugSpeed);
      if(this.entranceRemaining===0)this.model.startEncounter();
    }
    const elapsed=entering?0:this.model.advance(dt,this.debugSpeed);
    const delta=before==='combat'?(this.model.phase==='combat'?realDelta*this.debugSpeed:elapsed):
      ['menu','win','lose'].includes(before)?realDelta:0;
    if(before==='combat'||before==='menu')this.visualTime+=delta;
    if(this.flowMaterial){this.flowParams.x=this.visualTime;this.flowMaterial.setProperty('flowParams',this.flowParams);}
    this.frameCount++;this.frameSeconds+=dt;if(this.frameSeconds>=1){this.fps=Math.round(this.frameCount/this.frameSeconds);this.frameCount=0;this.frameSeconds=0;}
    const frozen=['paused','workshop','supply'].includes(this.model.phase);
    if(!frozen)this.damageNumbers.advance(realDelta);
    if(!frozen)this.windLessonLife=Math.max(0,this.windLessonLife-realDelta);
    if(!frozen)this.buildCelebration=Math.max(0,this.buildCelebration-realDelta);
    if(!frozen)this.engineFlash=Math.max(0,this.engineFlash-realDelta);
    this.scrapPulse=Math.max(0,this.scrapPulse-realDelta*3);
    if(!frozen){this.toastLife=Math.max(0,this.toastLife-delta);this.shake=Math.max(0,this.shake-delta*20);
      this.chainLife=Math.max(0,this.chainLife-delta);if(this.chainLife===0)this.chain=0;}
    if(!frozen)for(const p of this.particles){p.life-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;const drag=Math.pow(.96,delta*60);p.vx*=drag;p.vy*=drag;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const d of this.defeated){
      if(!frozen){d.life-=delta;d.x+=d.vx*delta;d.y+=d.vy*delta;d.angle+=delta*18;}
      d.node.setPosition(d.x,d.y,0);d.node.angle=d.angle;
      const fade=Math.max(0,d.life/.42);d.node.setScale(.6+.4*fade,.6+.4*fade,1);
      d.node.getComponent(Sprite)!.color=new Color(24,48,47,Math.round(210*fade));
      if(d.life<=0)d.node.destroy();
    }
    this.defeated=this.defeated.filter(d=>d.life>0);
    if(!frozen)for(const e of this.supportEffects)e.life-=delta;
    this.supportEffects=this.supportEffects.filter(e=>e.life>0);
    let frameKills=0;const discoveries:string[]=[];
    for(const e of this.model.effects.splice(0)) {
      if(this.showDamage && e.damage && ['hit','damage','shield-damage','shield'].includes(e.type)){
        const incoming=e.type==='damage'||e.type==='shield-damage',shield=e.type==='shield-damage'||e.type==='shield';
        const color=shield?'#ABDDEA':incoming?'#F3A18E':e.element==='ice'?'#BDEBF1':e.element==='electric'?'#D8C4ED':e.element==='fire'?'#F1BB91':e.element==='acid'?'#D4DFA4':'#F5D6A6';
        const kind=classifyDamageNumber(e.damage,e.source||'',incoming,shield);
        this.damageNumbers.add(`${incoming?e.type:e.enemyId}:${kind}:${shield?'shield':e.element??e.source??''}`,e.x,e.y,e.damage,color,incoming,shield,kind);
      }
      if(e.type==='shield-damage'){
        const type=(e.dx??this.model.shieldHp)<=0?'shield-break':'shield-hit';
        this.supportEffects.push({type,x:e.x,y:e.y,dx:0,dy:0,size:e.size,life:.65,max:.65});
        continue;
      }
      if(e.type==='discovery'&&e.recipeId){
        const recipe=RECIPES.find(r=>r.id===e.recipeId);
        if(recipe&&!this.knownRecipes.has(recipe.id)){
          this.knownRecipes.add(recipe.id);this.newRecipes.add(recipe.id);discoveries.push(recipe.name);this.tone(710,.35,'triangle');this.shake=Math.max(this.shake,3);
          try{globalThis.localStorage?.setItem('doomsday-recipes-v04',JSON.stringify(Array.from(this.knownRecipes)));}catch{}
          this.garage=readGarage(JSON.stringify(this.garage),Array.from(this.knownRecipes));this.saveGarage();
        }
        continue;
      }
      if(e.type==='link-feed'){
        const recipe=RECIPES.find(r=>r.id===e.recipeId);
        const support=recipe&&(recipe.a===recipe.executor?recipe.b:recipe.a);
        const color=support?CARS[support].color:C.teal;
        this.supportEffects.push({type:'feed',x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:20,life:.38,max:.38,color,recipeId:e.recipeId});
        if(e.recipeId==='cannon-fan'&&!this.firstWindFeed){
          this.firstWindFeed=true;this.windLessonText='风扇供能 → 火炮射出贯穿弹';this.windLessonLife=5;
        }
        if(this.supportEffects.length>48)this.supportEffects.shift();
        continue;
      }
      if(e.type==='chain-reaction'){
        this.supportEffects.push({type:'feed',x:e.x,y:e.y,dx:0,dy:0,size:24,life:.28,max:.28,recipeId:e.recipeId});
        continue;
      }
      if(e.type==='build-overdrive'){
        this.buildCelebration=1.1;this.toast(`${this.model.buildPower.overdrive.name} · 全列爆发`);
        this.shake=Math.max(this.shake,3);this.formationSound();continue;
      }
      if(e.type==='locomotive-skill'){
        this.engineFlash=.8;this.toast(`${this.model.engineState?.name} · ${this.model.engineState?.skillName}`);
        this.formationSound();continue;
      }
      if(e.type==='milestone'){this.toast('首领突破 · 下次补给追加改装');this.shake=Math.max(this.shake,4);this.tone(520,.4,'triangle');continue;}
      if(e.type==='enemy-introduced'){
        const look=ENEMY_LOOKS[e.enemyKind??0];this.toast(`${look.name} · ${look.hint}`);continue;
      }
      if(e.type==='region'){this.toast(`驶入 ${this.model.worldState.name} · ${this.model.worldState.enemyHint}`);this.formationSound();continue;}
      if(e.type==='demonstration-pack')continue;
      if(e.type==='boss-charge'){this.toast('破阵者蓄力 · 即将冲击列车');this.tone(145,.3,'sawtooth');continue;}
      if(e.type==='cold-shatter'){
        this.supportEffects.push({type:'iceblast',x:e.x,y:e.y,dx:0,dy:0,size:27,life:.38,max:.38,recipeId:e.recipeId});
        this.weaponSound('ice');continue;
      }
      if(e.type==='parallel-shot'){this.weaponSound('parallel');continue;}
      if(e.type==='pierce-hit'){
        this.supportEffects.push({type:'wind-impact',x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life:.45,max:.45,recipeId:e.recipeId});
        if(e.size>=2 && e.size>this.windChainBest){
          this.windChainBest=e.size;this.windLessonText=`一弹贯穿 ${e.size} 名敌人 · 风扇 → 火炮`;this.windLessonLife=4;
          this.tone(850,.10,'triangle');
        }
        continue;
      }
      if(e.type==='pierce'){this.weaponSound('pierce');continue;}
      if(e.type==='link-shot'){
        const recipe=RECIPES.find(r=>r.id===e.recipeId),electric=recipe?.executor==='tesla';
        this.supportEffects.push({type:electric?'tesla':'thermal-shot',x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life:.24,max:.24});
        continue;
      }
      const visualKind=e.type==='focused-flame'&&e.recipeId==='flame-prism'?'prismbeam':({fan:'wind','focused-flame':'beam','burning-arc':'tesla',conduction:'tesla',
        'burn-blast':'blast',thermal:'thermalburst',blizzard:'cryo',shatter:'iceblast'} as Record<string,string>)[e.type]||e.type;
      if(['rail-beam','train-shield','flame','tesla','cryo','wind','beam','prismbeam','blast','thermalburst','slam','iceblast','burn','acid','prism','regen','shield','brood','repair','passive-repair','cannon-impact'].includes(visualKind)){
        const life=e.type==='rail-beam'?.38:e.type==='train-shield'?.9:e.type==='flame'?.36:e.type==='tesla'?.24:e.type==='repair'?.8:e.type==='cannon-impact'?.38:.5;
        this.supportEffects.push({type:visualKind,x:e.x,y:e.y,dx:e.dx??0,dy:e.dy??0,size:e.size,life,max:life,recipeId:e.recipeId});
        if(this.supportEffects.length>32)this.supportEffects.shift();
        if(e.type==='slam'){this.shake=5;this.tone(55,.25,'triangle');this.toast('首领冲击 · 命中列车');}
        if(e.type==='tesla'||e.type==='conduction')this.weaponSound('electric');
        if(e.type==='flame'||e.type==='focused-flame')this.weaponSound('flame');
        if(e.type==='cryo'||e.type==='shatter')this.weaponSound('ice');
        if(e.type==='thermal')this.weaponSound('blast');
        if(e.type==='repair'){this.toast(`应急维修 · 装甲 +${e.size}`);this.tone(520,.22);}
        continue;
      }
      if(e.type==='boss'){this.toast('精英破阵者 · 击破后继续前进');this.tone(95,.4,'triangle');continue;}
      if(e.type==='wave'){
        this.toast(`第 ${this.model.wave} 波 · ${this.model.encounterBeat}`);
        this.tone(210,.28,'triangle');continue;
      }
      if((e.type==='hit'||e.type==='shield')&&this.supportEffects.length<48){
        const heavy=(e.damage??0)>=40,color=e.type==='shield'?'#A8DCDD':e.element==='fire'?'#F1B080':e.element==='electric'?'#F4D699':e.element==='ice'?'#B4E8EE':e.element==='acid'?'#CEDB9D':'#F1CFAB';
        const life=heavy?.28:.18;
        this.supportEffects.push({type:e.type==='shield'?'shield-impact':'ink-impact',x:e.x,y:e.y,dx:e.dx??Math.sign(e.x),dy:e.dy??0,size:heavy?38:22,life,max:life,color});
      }
      const count=e.type==='upgrade'?40:e.type==='kill'?7:e.type==='hit'?2:9;
      const color=e.type==='kill'?C.ink:e.type==='damage'?C.red:e.type==='upgrade'?C.teal:C.gold;
      for(let i=0;i<count&&this.particles.length<200;i++){
        const a=e.type==='kill'?Math.atan2(e.dy??0,e.dx??1)+(i/count-.5)*1.9:(i/count)*Math.PI*2+this.visualTime, speed=e.type==='upgrade'?150:45+Math.random()*100;
        this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.3,max:.7,size:e.type==='kill'?3:5,color});
      }
      if(e.type==='kill'){
        frameKills++;this.scrapPulse=1;
        if(this.zombieFrame&&this.defeated.length<24){
          const size=e.enemyKind===2?67:52,n=this.sprite('Defeated',this.enemyFrames.get(e.enemyKind??0)||this.zombieFrame,size,size,this.enemyLayer);
          n.setPosition(e.x,e.y,0);n.angle=30;
          this.defeated.push({node:n,x:e.x,y:e.y,vx:(e.dx??Math.sign(e.x))*150,vy:(e.dy??.3)*150,life:.42,angle:30,size});
        }
      }
      if(e.type==='damage'){this.shake=6;this.tone(65,.15,'triangle');}
      if(e.type==='upgrade'){this.shake=8;this.tone(660,.35,'triangle');}
      if(e.type==='fire')this.weaponSound('cannon');
    }
    if(this.flameBed){const active=this.sound&&this.model.phase==='combat'&&this.audio.currentTime<this.flameUntil;
      this.flameBed.gain.gain.setTargetAtTime(active?.022:0,this.audio.currentTime,.035);}
    if(discoveries.length)this.toast(`发现联动 · ${discoveries.join(' / ')}`);
    if(this.model.phase==='combat'){
      const newly=this.model.buildProgression.milestones.filter(v=>v.completed&&!this.celebratedMilestones.has(v.id));
      for(const milestone of newly)this.celebratedMilestones.add(milestone.id);
      if(newly.length&&!discoveries.length&&this.toastLife<.5){
        this.toast(`构筑成长 · ${newly[newly.length-1].title}`);this.tone(620,.22,'triangle');
      }
    }
    if(frameKills){this.chain+=frameKills;this.chainLife=1.25;this.tone(130+Math.min(12,this.chain)*16,.065,'triangle');
      if(frameKills>=3)this.shake=Math.max(this.shake,Math.min(4,frameKills));}
    if(this.model.phase==='combat'){
      this.emberClock+=delta;
      if(this.emberClock>.045){this.emberClock=0;
        for(const v of this.model.vortices.slice(0,9))if(this.particles.length<200){
          const a=this.visualTime*12+v.id;
          this.particles.push({x:v.x+Math.cos(a)*v.radius*.65,y:v.y+Math.sin(a)*v.radius*.65,
            vx:-v.dx*.24+Math.cos(a)*35,vy:-v.dy*.24+Math.sin(a)*35,life:.32,max:.32,size:3,color:C.gold});
        }
      }
    }
    const cameraY=this.combatOffset-650*Math.pow(this.entranceRemaining,3);
    this.worldNode.setPosition(!this.lowMotion?Math.sin(this.visualTime*85)*this.shake:0,cameraY,0);
    this.fx.node.setPosition(this.worldNode.position.x,cameraY,0);
    if(this.loco){
      this.loco.active=true;this.loco.setPosition(0,188,0);
      const engine=this.model.runLoadout?.engine||this.garage.loadout.engine,frame=this.engineFrames.get(engine);
      if(frame){const sprite=this.loco.getComponent(Sprite)!;sprite.spriteFrame=frame;sprite.customMaterial=this.lastLightReady?this.unitMaterial:null;this.loco.angle=0;this.loco.getComponent(UITransform)!.setAnchorPoint(.5,.5);this.loco.getComponent(UITransform)!.setContentSize(190*frame.rect.width/frame.rect.height,190);}
    }
    this.fxUsed=0;
    this.drawGround();this.drawWorld();this.drawEffects();this.drawHUD();
    for(let i=this.fxUsed;i<this.fxPool.length;i++)this.fxPool[i].active=false;
    if(this.model.phase==='lose'||this.model.phase==='win')this.finishRun();
    const nextState=`${this.model.phase}:${this.model.revision}:${this.selectedSlot}:${this.replacementConfirmed}:${this.atlas}:${this.atlasPage}:${this.atlasCars}:${this.knownRecipes.size}:${this.assemblyRemaining>0}:${this.garageOpen}:${this.garage.loadout.engine}:${this.garage.loadout.module}`;
    if(this.state!==nextState){this.state=nextState;this.drawPanel();}
    if(this.model.phase==='workshop'&&!this.atlas)for(const p of this.workshopPositions.values()){
      const blend=this.lowMotion?1:1-Math.exp(-realDelta*13);
      p.x+=(p.targetX-p.x)*blend;p.y+=(p.targetY-p.y)*blend;
      if(Math.hypot(p.targetX-p.x,p.targetY-p.y)<.3){p.x=p.targetX;p.y=p.targetY;}
      for(const node of p.nodes)if(node.isValid)node.setPosition(p.x,p.y,0);
    }
  }
  private drawGround() {
    const g=this.bg;g.clear();
    const shown=this.model.phase!=='menu';this.worldNode.active=shown;this.fx.node.active=shown;
    const visible=view.getVisibleSize(),cover=Math.max(1,visible.width/720,visible.height/1280);
    for(const art of [this.groundArt,this.menuArt,this.paperArt])if(art)art.getComponent(UITransform)!.setContentSize(720*cover,1280*cover);
    if(this.groundArt){this.groundArt.active=true;this.groundArt.setPosition(0,0,0);}
    else this.rect(g,-2000,-2000,4000,4000,C.ink);
    if(!shown)return;
    const travel=this.lowMotion?0:this.visualTime*16;
    // The scenic horizon stays still. Track joints and water wakes carry forward motion.
    for(const side of [-1,1]){
      const rail:number[]=[];
      for(let i=0;i<=28;i++){const t=i/28;rail.push(side*(3+39*t),520-965*t*t);}
      this.line(g,rail,'#0B2528B8',7);this.line(g,rail,'#BCA67C80',2);
    }
    for(let i=0;i<46;i++){
      const t=(i/46+travel/1800)%1,y=520-965*t*t,w=6+43*t;
      this.line(g,[-w,y,w,y],'#133132B5',3+3*t);
      this.line(g,[-w,y+2,w,y+2],'#D5C09760',1);
    }
    for(let i=0;i<10;i++){
      const side=i%2?1:-1,x=side*(85+(i*47)%170),t=((this.lowMotion?0:this.visualTime)*.22+i*.37)%1,y=330-i*66;
      g.strokeColor=new Color(233,222,175,Math.round((1-t)*35));g.lineWidth=1;
      g.ellipse(x,y,10+t*20,2+t*4);g.stroke();
    }
  }
  private car(g:Graphics,y:number) {
    this.rect(g,-51,y-55,108,114,'#102025',14);
    for(const x of [-54,44]){this.rect(g,x,y-42,10,29,'#080F14',3);this.rect(g,x,y+14,10,29,'#080F14',3);}
    this.rect(g,-47,y-49,94,103,'#526966',10);this.rect(g,-40,y-42,80,88,'#2F4649',8);
    this.line(g,[-38,y+43,37,y+43],'#95ABA0',3);
    for(const x of [-34,34])for(const yy of [-34,35])this.circle(g,x,y+yy,3,'#A4AD92');
    this.rect(g,-12,y-67,24,15,'#71817A',3);
  }
  private drawWorld() {
    const g=this.world,d=this.details,a=this.attacks,m=this.model;g.clear();d.clear();a.clear();
    const ids=new Set(m.enemies.map(e=>e.id));
    for(const [id,n]of this.enemySprites)if(!ids.has(id)){n.destroy();this.enemySprites.delete(id);}
    for(const e of m.enemies){
      const size=e.kind===3?94:e.kind===2||e.kind>=6?60:49;
      this.circle(g,e.x+3,e.y-5,size*.42,'#17162399');
      if((e.slow??0)>0){g.strokeColor=new Color('#8ADDEB88');g.lineWidth=2;g.circle(e.x,e.y,size*.58);g.stroke();}
      if(e.freeze>0){this.polygon(a,[e.x,e.y+size*.7,e.x+size*.55,e.y,e.x,e.y-size*.7,e.x-size*.55,e.y],'#87D9EF66');
        this.line(a,[e.x-size*.3,e.y+size*.15,e.x,e.y-size*.3,e.x+size*.22,e.y+size*.3],'#E7FFFF',2);}
      if(e.kind===3){
        a.strokeColor=new Color('#F4785F33');a.lineWidth=10;a.circle(e.x,e.y,60);a.stroke();
        a.strokeColor=new Color(m.bossCharge>.72?C.red:C.gold);a.lineWidth=4;a.arc(e.x,e.y,60,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.01,m.bossCharge),false);a.stroke();
      }
      const enemyFrame=this.enemyFrames.get(e.kind)||this.zombieFrame;
      if(enemyFrame){
        let n=this.enemySprites.get(e.id);if(!n){
          const ratio=enemyFrame.rect.width/enemyFrame.rect.height;
          n=this.sprite(ENEMY_LOOKS[e.kind].name,enemyFrame,size*1.5*Math.min(1,ratio),size*1.5/Math.max(1,ratio),this.enemyLayer);this.enemySprites.set(e.id,n);
        }
        const gait=e.freeze>0?0:Math.sin(this.visualTime*12+e.id*2.4);
        const recoil=this.lowMotion?0:Math.sin(Math.min(1,e.flash/.1)*Math.PI)*3;
        n.setPosition(e.x+Math.sign(e.x)*recoil,e.y+gait*1.6,0);n.angle=this.lastLightEnemyReady?gait*2:(Math.atan2(-180-e.y,-e.x)+Math.PI/2)*180/Math.PI+gait*5;
        const squash=this.lowMotion?0:Math.min(1,e.flash/.1);
        n.setScale(1+squash*.12,1-squash*.055,1);
        n.getComponent(Sprite)!.color=new Color(e.flash>0?'#FFF0CD':e.freeze>0?'#A4E6F2':(e.slow??0)>0?'#BFDAE9':'#FFFFFF');
      }else this.circle(g,e.x,e.y,size*.4,e.kind===4?C.gold:C.muted);
      if(e.kind===2||e.kind===4||e.kind===5){
        const color=e.kind===2?'#D2DFE5':e.kind===4?'#FFA552':'#C9A1ED';
        this.line(a,[e.x-8,e.y+24,e.x,e.y+32,e.x+8,e.y+24,e.x,e.y+17,e.x-8,e.y+24],color,3);
      }
      if(e.hp<e.maxHp&&e.kind!==3){this.rect(a,e.x-16,e.y-29,32,4,'#102023',2);this.rect(a,e.x-16,e.y-29,32*Math.max(0,e.hp/e.maxHp),4,C.red,2);}
      if((e.barrier??0)>0){
        const ward:number[]=[];
        for(let j=0;j<=10;j++){const q=-.2+j*.36,r=size*.62+Math.sin(j*2.3)*2;ward.push(e.x+Math.cos(q)*r,e.y+Math.sin(q)*r);}
        this.line(a,ward,'#BED8E2AA',2);
      }
      if((e.corrosion??0)>0)this.paintRect(a,e.x-14,e.y-19,28,7,'#C9BE86B0');
    }
    if(!this.loco&&(this.entranceRemaining>0||m.time<1.4)){this.rect(g,-35,210,70,92,'#5A7772',12);this.rect(g,-28,256,56,28,'#152E35',6);}
    this.drawBuildAura(g);
    const engine=m.engineState;
    if(engine){
      const accent=ENGINES[engine.id].color;
      const ready=1-engine.cooldown/engine.chargeTime;
      this.line(d,[-26,108,26,108],'#171B2B',4);
      this.line(d,[-26,108,-26+52*ready,108],accent,2);
      if(this.engineFlash>0){
        const radius=55+(this.lowMotion?0:(1-this.engineFlash/.8)*35);
        d.strokeColor=new Color(accent+Math.round(this.engineFlash/.8*170).toString(16).padStart(2,'0'));d.lineWidth=2.5;d.circle(0,188,radius);d.stroke();
      }
    }
    const carIds=new Set(m.slots.map((c,i)=>c?c.id:-i-1));
    for(const [id,n]of this.carArt)if(!carIds.has(id)){n.destroy();this.carArt.delete(id);}
    for(const [id,n]of this.weaponSprites)if(!carIds.has(id)){n.destroy();this.weaponSprites.delete(id);}
    m.slots.forEach((car,i)=>{
      const y=this.slotY[i];
      const themed=this.chassisMaterial?this.chassisFrames.get(m.runLoadout?.engine||this.garage.loadout.engine):undefined;
      if(!this.hullFrame&&!themed)this.car(g,y);
      const hull=themed||this.hullFrame||this.carriageFrame;
      const carId=car?car.id:-i-1;
      if(hull){let n=this.carArt.get(carId);if(!n){n=this.sprite('Carriage',hull,78,106,this.trainLayer);n.setSiblingIndex(0);this.carArt.set(carId,n);}const s=n.getComponent(Sprite)!;s.spriteFrame=hull;s.customMaterial=themed?this.chassisMaterial:this.unitMaterial;n.getComponent(UITransform)!.setAnchorPoint(.5,.5);n.getComponent(UITransform)!.setContentSize(themed?106*hull.rect.width/hull.rect.height:136,themed?106:110);n.setPosition(0,y,0);s.color=new Color(car?'#FFFFFF':'#9E96AD');}
      // A continuous steel drawbar joins the standardized sockets, including the head.
      const front=i===0?96:this.slotY[i-1]-47;
      this.line(d,[0,y+47,0,front],'#131520',8);
      this.line(d,[-2,y+47,-2,front],'#B0A399',2);
      this.rect(d,-5,(y+47+front)/2-3,10,6,'#756877',1);
      if(!car){this.line(d,[-8,y,8,y],C.cream,1.5);this.line(d,[0,y-8,0,y+8],C.cream,1.5);return;}
      const angle=m.getRenderAngle(i);
      const accent=CARS[car.type].color;
      if(car.type==='shield'){
        const ready=1-Math.min(1,m.getCarCooldown(i)/m.getCarAttackStats(i).interval),points:number[]=[];
        for(let j=0;j<=24;j++){const q=-Math.PI/2+j/24*Math.PI*2*ready;points.push(Math.cos(q)*43,y+Math.sin(q)*43);}
        this.line(d,points,C.gold+'C0',2);
      }
      this.line(d,[-40,y-38,-40,y-27],accent+'99',2);
      const weapon=this.weaponFrames.get(car.type);
      if(weapon){
        let n=this.weaponSprites.get(car.id);
        if(!n){const h=car.type==='fan'?92:car.type==='rail'?124:110;n=this.sprite('Weapon',weapon,h*weapon.rect.width/weapon.rect.height,h,this.trainLayer);this.weaponSprites.set(car.id,n);}n.getComponent(Sprite)!.customMaterial=this.unitMaterial;
        const directional=car.type==='cannon'||car.type==='flame'||car.type==='rail',recoil=directional?Math.sin(Math.min(1,car.flash/.15)*Math.PI*.85)*6:0;
        n.angle=car.type==='fan'?(this.lowMotion?0:Math.sin(this.visualTime*2.5)*7):directional?angle*180/Math.PI-90:0;
        n.setPosition(-Math.cos(angle)*recoil,y-Math.sin(angle)*recoil,0);
        const pulse=directional||car.type==='fan'?1:1+car.flash*.22;n.setScale(pulse,pulse,1);
      }else{this.circle(d,0,y,34,'#0C1D2290');this.drawCarModule(d,car.type,0,y,1,angle);}
      if(car.flash>0){
        if(car.type==='cannon'||car.type==='rail'){
          const mx=Math.cos(angle)*53,my=y+Math.sin(angle)*53;
          const rail=car.type==='rail';
          this.artEffect(5,mx,my,rail?94:64,rail?20:58,angle*180/Math.PI,car.flash/.15,rail?'#B9EBEC':'#EDB080');
        }
      }
      if(car.level>0)for(let j=0;j<Math.min(7,car.level);j++)this.circle(d,-31+j*10,y-39,3,C.gold);
    });
    for(const link of m.links){
      const y=(this.slotY[link.index]+this.slotY[link.index+1])/2;
      const known=this.knownRecipes.has(link.recipe.id),glow=known?C.gold:C.cream;
      this.line(d,[0,y-12,0,y+12],'#FFE5A02E',18);
      this.line(d,[0,y-10,0,y+10],glow,4);
      const direction=link.driver<link.support?1:-1;
      const pulse=this.lowMotion?0:((this.visualTime*1.8+link.index*.23)%1-.5)*18;
      this.circle(d,0,y+direction*pulse,3,C.cream);
    }
    for(const p of m.projectiles){
      if(p.beam)continue;
      const color=p.corrosion?'#D4C78B':p.element==='ice'?'#B5DFEA':p.kind==='pierce'?'#F1D594':p.recipeId==='cannon-prism'?'#FFF0C5':p.element==='fire'?'#E9B191':p.element==='electric'?C.teal:C.gold;
      const length=Math.max(1,Math.hypot(p.dx,p.dy));
      const trail=p.kind==='pierce'?54:p.kind==='shatter'?32:22;
      const angle=Math.atan2(p.dy,p.dx)*180/Math.PI;
      const dx=p.dx/length,dy=p.dy/length;
      if(p.kind==='pierce'){
        this.artEffect(0,p.x-dx*58,p.y-dy*58,156,13,angle,.8,'#B3DEEA');
        this.line(a,[p.x-dx*112,p.y-dy*112,p.x+dx*7,p.y+dy*7],'#A8DADE66',5);
        this.line(a,[p.x-dx*70,p.y-dy*70,p.x+dx*7,p.y+dy*7],'#EFF4E5',1.8);
        for(const side of[-1,1])this.line(a,[p.x-dx*76-dy*side*5,p.y-dy*76+dx*side*5,p.x-dx*32-dy*side*4,p.y-dy*32+dx*side*4],'#E5C17D88',1);
        continue;
      }
      if(p.kind==='cannon'){
        if(p.recipeId==='cannon-prism')this.line(a,[p.x-dx*30,p.y-dy*30,p.x,p.y],color+'AA',4);
        this.artEffect(0,p.x-dx*10,p.y-dy*10,33,26,angle,.9,color);
        for(let j=1;j<=3;j++){
          const drift=Math.sin(p.id+j)*j*1.7,tail=j*10;
          this.line(a,[p.x-dx*tail-dy*drift,p.y-dy*tail+dx*drift,p.x-dx*(tail+5)-dy*drift,p.y-dy*(tail+5)+dx*drift],j===1?'#E6B99DBB':'#BC9DA45A',6-j);
        }
        const r=Math.max(5,p.radius);
        this.polygon(a,[p.x+dx*r,p.y+dy*r,p.x-dy*r*.7,p.y+dx*r*.7,p.x-dx*r,p.y-dy*r,p.x+dy*r*.65,p.y-dx*r*.65],'#E6B99D');
        this.line(a,[p.x+dx*r*.6,p.y+dy*r*.6,p.x-dy*r*.4,p.y+dx*r*.4],'#FFF0CA',3);
        continue;
      }
      for(let j=1;j<=4;j++){
        const tail=j*11,wave=Math.sin(this.visualTime*32+p.id+j)*j*.6;
        this.line(a,[p.x-dx*tail-dy*wave,p.y-dy*tail+dx*wave,p.x-dx*(tail+7)-dy*wave,p.y-dy*(tail+7)+dx*wave],color+(j<3?'99':'44'),Math.max(1,4-j));
      }
      if(this.artEffect(0,p.x-p.dx/length*15,p.y-p.dy/length*15,p.kind==='pierce'?100:66,32,angle,.9,color)){
        if(p.kind==='shatter')this.artEffect(2,p.x,p.y,34,34,angle,.6);
        continue;
      }
      this.line(a,[p.x-p.dx/length*trail,p.y-p.dy/length*trail,p.x,p.y],color+'44',12);
      this.line(a,[p.x-p.dx/length*trail,p.y-p.dy/length*trail,p.x,p.y],color,3);
      if(p.kind==='pierce'){a.strokeColor=new Color(color);a.lineWidth=2;a.circle(p.x,p.y,13);a.stroke();}
      if(p.kind==='shatter')this.polygon(a,[p.x,p.y+13,p.x+9,p.y,p.x,p.y-13,p.x-9,p.y],color+'AA');
      this.circle(a,p.x,p.y,Math.max(4,Math.min(9,p.radius)),C.cream);
    }
    const vortexIds=new Set(m.vortices.map(v=>v.id));
    for(const [id,n]of this.vortexSprites)if(!vortexIds.has(id)){n.destroy();this.vortexSprites.delete(id);}
    for(const v of m.vortices){
      const fade=Math.min(1,v.life/.3),spin=this.visualTime*9+v.id;
      if(v.element==='electric'){
        for(const e of m.enemies){
          const distance=Math.hypot(e.x-v.x,e.y-v.y);
          if(e.hp<=0||e.kind===3||distance>v.radius||distance<12)continue;
          const t=(this.visualTime*2+e.id*.17)%1,x=e.x+(v.x-e.x)*t,y=e.y+(v.y-e.y)*t;
          this.line(a,[e.x,e.y,v.x,v.y],'#A8DADE24',1);
          this.circle(a,x,y,2,'#D2F2E5');
        }
        const bloom=Math.min(1,v.age/.22),pulse=1+Math.sin(spin*1.3)*.09;
        if(this.artEffect(7,v.x,v.y,v.radius*2.2*pulse*bloom,v.radius*1.7/pulse*bloom,spin*26,.42*fade)){
          this.artEffect(7,v.x,v.y,v.radius*1.3*bloom,v.radius*1.3*bloom,-spin*43,.28*fade);
          for(let j=0;j<4;j++){
            const q=spin*1.4+j*Math.PI/2,r=v.radius*(.55+.2*Math.sin(q*1.7));
            this.ribbon(a,v.x,v.y,q,r,3,spin+j,'#E5C17D99');
            this.circle(a,v.x+Math.cos(q)*r,v.y+Math.sin(q)*r,2,C.teal);
          }
          continue;
        }
        a.strokeColor=new Color('#77E9E3');a.lineWidth=3;a.circle(v.x,v.y,v.radius*.75);a.stroke();
        a.strokeColor=new Color('#E5C17D');a.lineWidth=2;a.circle(v.x,v.y,v.radius*.5);a.stroke();
        for(let i=0;i<4;i++){
          const q=spin+i*Math.PI/2,r=v.radius*.8;
          this.line(a,[v.x+Math.cos(q)*r,v.y+Math.sin(q)*r,v.x+Math.cos(q+.5)*r*.4,v.y+Math.sin(q+.5)*r*.4,v.x,v.y],'#ACFFF0',3);
        }
      }else if(this.fireFrame){
        let n=this.vortexSprites.get(v.id);
        if(!n){n=this.sprite('Linked vortex',this.fireFrame,v.radius*2.45,v.radius*2.45,this.vortexLayer);this.emission(n.getComponent(Sprite)!);this.vortexSprites.set(v.id,n);}
        n.setPosition(v.x,v.y,0);n.angle=spin*180/Math.PI;
        const grow=(.7+.3*Math.min(1,v.age/.12))*(.85+.15*fade);n.setScale(grow,grow,1);
        n.getComponent(Sprite)!.color=new Color(255,241,210,Math.round(185*fade));
      }else this.drawVortex(a,v.x,v.y,v.radius,spin,Math.atan2(v.dy,v.dx),fade);
    }
  }
  /**
   * A low-cost, animated signature for the active build.  The train remains
   * readable because the marks are painted onto the ground pass before cars
   * and weapons are drawn; the motion communicates build state without adding
   * another HUD-only label.
   */
  private drawBuildAura(g:Graphics) {
    if(!this.model.links.length)return;
    const pulse=this.lowMotion?1:1+Math.sin(this.visualTime*2)*.06;
    const connected=new Set<number>();for(const link of this.model.links){connected.add(link.driver);connected.add(link.support);}
    for(const i of connected){
      this.circle(g,0,this.slotY[i],39*pulse,'#F3C16A10');
      this.circle(g,0,this.slotY[i],26*pulse,'#FFE4A914');
    }
  }
  private drawCarModule(g:Graphics,type:CarType,x:number,y:number,scale:number,angle=0) {
    if(type==='fan')this.drawFan(g,x,y,29*scale,this.visualTime*16);
    else if(type==='tesla'||type==='cryo')this.drawSupport(g,type,x,y,scale);
    else if(type==='flame')this.drawTurret(g,x,y,angle,scale);
    else if(type==='rail')this.drawRail(g,x,y,scale,angle);
    else if(type==='prism')this.drawPrism(g,x,y,scale);
    else if(type==='acid')this.drawAcid(g,x,y,scale);
    else if(type==='repair')this.drawRepair(g,x,y,scale);
    else if(type==='shield')this.drawShield(g,x,y,scale);
    else{
      this.circle(g,x,y,29*scale,'#253B40');this.circle(g,x,y,23*scale,'#84958C');
      const dx=Math.cos(angle),dy=Math.sin(angle);
      this.line(g,[x-dx*13*scale,y-dy*13*scale,x+dx*48*scale,y+dy*48*scale],'#16292F',22*scale);
      this.line(g,[x,y,x+dx*46*scale,y+dy*46*scale],'#ADAB84',12*scale);
      this.circle(g,x-dx*10*scale,y-dy*10*scale,10*scale,'#4C6564');
      this.circle(g,x+dx*47*scale,y+dy*47*scale,6*scale,C.gold);
    }
  }
  private drawRail(g:Graphics,x:number,y:number,scale:number,angle:number) {
    const c=Math.cos(angle),s=Math.sin(angle),p=(px:number,py:number)=>[x+(px*c-py*s)*scale,y+(px*s+py*c)*scale];
    const poly=(v:number[],color:string)=>{const out:number[]=[];for(let i=0;i<v.length;i+=2)out.push(...p(v[i],v[i+1]));this.polygon(g,out,color);};
    this.circle(g,x+2*scale,y-3*scale,31*scale,'#101D25');
    poly([-28,-17,39,-17,46,-9,46,9,39,17,-28,17,-35,8,-35,-8],'#3D545A');
    for(const off of[-10,10]){poly([-25,off-3,39,off-3,39,off+3,-25,off+3],'#AEC7C3');this.line(g,[...p(-25,off),...p(39,off)],'#CFEDE3',1.7*scale);}
    for(const xx of[-20,20]){const q=p(xx,-20);this.circle(g,q[0],q[1],3.2*scale,'#D19A55');}
    const muzzle=p(50,0);this.circle(g,muzzle[0],muzzle[1],8*scale,'#172C32');this.circle(g,muzzle[0],muzzle[1],3.2*scale,C.teal);
  }
  private drawPrism(g:Graphics,x:number,y:number,scale:number) {
    const r=31*scale;
    this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#121C29');
    this.polygon(g,[x,y-r,x+r*.65,y-r*.22,x+r*.47,y+r*.68,x,y+r,x-r*.52,y+r*.52,x-r*.7,y-r*.18],'#5D4E70');
    this.polygon(g,[x,y-r*.78,x+r*.32,y-r*.12,x+r*.18,y+r*.53,x-r*.2,y+r*.28,x-r*.34,y-r*.2],'#E6B5D9');
    this.line(g,[x,y-r*.78,x,y+r*.8],C.cream,2*scale);this.line(g,[x-r*.34,y-r*.2,x+r*.32,y-r*.12],C.cream+'B0',1.4*scale);
    this.line(g,[x-r*1.15,y+r*.3,x-r*.48,y,x-r*1.12,y-r*.32],C.teal+'99',2*scale);
    this.line(g,[x+r*1.15,y-r*.3,x+r*.48,y,x+r*1.12,y+r*.32],C.gold+'99',2*scale);
  }
  private drawAcid(g:Graphics,x:number,y:number,scale:number) {
    const r=30*scale;
    this.circle(g,x+2*scale,y-2*scale,r+5*scale,'#121C24');
    this.polygon(g,[x-r*.34,y-r*.9,x+r*.34,y-r*.9,x+r*.26,y-r*.52,x+r*.58,y+r*.63,x+r*.4,y+r*.84,x-r*.4,y+r*.84,x-r*.58,y+r*.63,x-r*.26,y-r*.52],'#5A6A50');
    this.polygon(g,[x-r*.47,y+r*.18,x+r*.47,y+r*.18,x+r*.4,y+r*.7,x-r*.4,y+r*.7],'#B7D26E');
    this.line(g,[x-r*.26,y-r*.92,x+r*.26,y-r*.92],C.gold,4*scale);
    this.circle(g,x-r*.18,y+r*.38,3.2*scale,'#EAF0B3');this.circle(g,x+r*.2,y+r*.53,2.2*scale,'#EAF0B3');
    this.line(g,[x+r*.75,y-r*.18,x+r*1.05,y-r*.42],C.teal+'99',2*scale);
  }
  private drawRepair(g:Graphics,x:number,y:number,scale:number) {
    const r=28*scale;this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#111D22');
    this.polygon(g,[x-r*.72,y-r*.57,x+r*.72,y-r*.57,x+r*.78,y+r*.6,x-r*.78,y+r*.6],'#788B7C');
    this.line(g,[x-r*.56,y-r*.27,x+r*.56,y-r*.27],C.gold,2*scale);
    this.line(g,[x-r*.38,y,x+r*.38,y],C.teal,5*scale);this.line(g,[x,y-r*.38,x,y+r*.38],C.teal,5*scale);
    this.line(g,[x-r*.86,y+r*.78,x-r*.22,y+r*.12,x+r*.03,y+r*.35,x+r*.82,y-r*.45],C.cream,4*scale);
    this.circle(g,x-r*.9,y+r*.78,3*scale,C.gold);this.circle(g,x+r*.82,y-r*.45,3*scale,C.gold);
  }
  private drawShield(g:Graphics,x:number,y:number,scale:number) {
    const r=29*scale;this.circle(g,x+2*scale,y-2*scale,r+6*scale,'#101C28');
    this.polygon(g,[x-r*.72,y-r*.68,x+r*.22,y-r*.68,x+r*.7,y-r*.2,x+r*.7,y+r*.62,x-r*.72,y+r*.62],'#4F6979');
    this.circle(g,x-r*.08,y+r*.05,9*scale,'#203B4B');this.circle(g,x-r*.08,y+r*.05,4*scale,C.teal);
    g.strokeColor=new Color('#BDEDF0CC');g.lineWidth=3*scale;g.arc(x+r*.08,y+r*.02,r*.98,-Math.PI*.82,Math.PI*.82,false);g.stroke();
    this.line(g,[x-r*.62,y-r*.54,x+r*.32,y-r*.54],C.gold,2*scale);this.circle(g,x+r*.4,y-r*.54,3*scale,C.gold);
  }
  private drawTurret(g:Graphics,x:number,y:number,angle:number,scale:number) {
    const c=Math.cos(angle),s=Math.sin(angle);
    const point=(px:number,py:number)=>[x+(px*c-py*s)*scale,y+(px*s+py*c)*scale];
    const part=(points:number[],color:string)=>{const out:number[]=[];for(let i=0;i<points.length;i+=2)out.push(...point(points[i],points[i+1]));this.polygon(g,out,color);};
    this.circle(g,x+3,y-3,33*scale,'#111D21');this.circle(g,x,y,30*scale,'#B09060');this.circle(g,x,y,26*scale,'#36504D');
    for(const yy of [-18,18]){
      part([-24,yy-7,-2,yy-7,2,yy-3,2,yy+5,-22,yy+7,-26,yy+2],'#263A3B');
      part([-22,yy-4,-3,yy-4,-3,yy+3,-22,yy+4],'#C27436');
      part([-17,yy-6,-14,yy-6,-14,yy+5,-17,yy+5],'#CFB17C');
    }
    part([-21,-11,9,-11,19,-7,19,7,9,11,-21,11,-25,0],'#667E70');
    part([-16,4,11,4,16,7,-16,8],'#B0B49A');
    part([6,-7,45,-7,50,-4,50,4,45,7,6,7],'#162C30');
    part([9,-4,46,-4,46,3,9,3],'#AF9563');
    for(const xx of [20,29,38])part([xx,-8,xx+4,-8,xx+4,8,xx,8],'#3E5350');
    part([43,-10,54,-10,57,-5,57,5,54,10,43,10],'#D58236');
    const muzzle=point(53,0);this.circle(g,muzzle[0],muzzle[1],5*scale,'#15292D');this.circle(g,muzzle[0],muzzle[1],2.5*scale,C.gold);
    const cap=point(-14,0);this.circle(g,cap[0],cap[1],5*scale,'#243B3E');
  }
  private drawFan(g:Graphics,x:number,y:number,r:number,spin:number) {
    // The reward preview and installed equipment share the same mechanical design.
    this.circle(g,x+2,y-3,r+7,'#101C20');this.circle(g,x,y,r+5,'#A38656');
    this.circle(g,x,y,r+2,'#71908B');this.circle(g,x,y,r,'#152B30');
    this.circle(g,x,y,r*.85,'#203A3F');
    for(let i=0;i<5;i++){
      const a=spin+i*Math.PI*2/5,c=Math.cos(a),s=Math.sin(a);
      const points:number[]=[];
      for(const [px,py] of [[.12,-.1],[.58,-.32],[.86,-.17],[.82,.08],[.52,.21],[.15,.1]])
        points.push(x+(px*c-py*s)*r,y+(px*s+py*c)*r);
      this.polygon(g,points,'#9EBEB1');
      this.line(g,[x+Math.cos(a-.25)*r*.3,y+Math.sin(a-.25)*r*.3,x+Math.cos(a-.17)*r*.77,y+Math.sin(a-.17)*r*.77],'#D3D8B9',Math.max(1,r*.045));
    }
    // Stationary cross-bracing and bolts distinguish an industrial blower from a toy pinwheel.
    for(let i=0;i<4;i++){
      const a=Math.PI/4+i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
      this.line(g,[x+c*r*.22,y+s*r*.22,x+c*r,y+s*r],'#3B5557',r*.075);
      this.circle(g,x+c*(r+2),y+s*(r+2),r*.055,'#E2BE7C');
    }
    this.circle(g,x,y,r*.24,'#14292E');this.circle(g,x,y,r*.16,'#AF8C50');this.circle(g,x,y,r*.075,'#EDD4A1');
  }
  private fanPreview() {
    const n=this.group('Fan carriage preview',this.overlayNode);n.setPosition(0,51,0);
    const base=this.layer('Carriage frame',n);
    // Preview uses the installed railcar proportions, with wheels and couplers visible.
    for(const x of [-65,51])for(const y of [-46,18])this.rect(base,x,y,14,30,'#0A171C',4);
    this.rect(base,-13,-82,26,15,'#819489',3);this.rect(base,-13,68,26,13,'#819489',3);
    this.rect(base,-58,-69,116,138,'#6C8174',12);
    if(this.carriageFrame)this.sprite('Armor deck',this.carriageFrame,110,128,n);
    const parts=this.layer('Blower assembly',n);
    if(!this.carriageFrame)this.rect(parts,-52,-62,104,124,'#304C4C',8);
    for(const x of [-51,39])for(const y of [-52,-42,40,50])this.rect(parts,x,y,12,4,'#D79847',1);
    this.drawFan(parts,0,0,42,.25);
    this.rect(parts,-16,49,32,11,'#23393D',3);this.line(parts,[-10,55,10,55],C.teal,3);
  }
  private drawSupport(g:Graphics,type:string,x:number,y:number,scale:number) {
    const r=29*scale;
    this.circle(g,x,y,r+4,'#12282D');this.circle(g,x,y,r,'#415C59');
    if(type==='tesla'){
      for(let i=0;i<4;i++){const a=i*Math.PI/2;const xx=x+Math.cos(a)*r*.68,yy=y+Math.sin(a)*r*.68;
        this.circle(g,xx,yy,8*scale,'#B47A3C');this.circle(g,xx,yy,4*scale,C.gold);}
      this.line(g,[x-10*scale,y+17*scale,x+4*scale,y+2*scale,x-4*scale,y-2*scale,x+10*scale,y-17*scale],C.teal,5*scale);
    }else if(type==='cryo'){
      this.polygon(g,[x,y+r*.8,x+r*.58,y,x,y-r*.8,x-r*.58,y],'#79CFE1');
      this.line(g,[x,y+r*.7,x,y-r*.7],'#E1FAED',3*scale);this.line(g,[x-r*.45,y,x+r*.45,y],'#E1FAED',3*scale);
    }else{
      this.rect(g,x-r*.7,y-r*.65,r*1.4,r*1.3,'#AC8745',5*scale);
      this.rect(g,x-4*scale,y-15*scale,8*scale,30*scale,C.cream,2*scale);
      this.rect(g,x-15*scale,y-4*scale,30*scale,8*scale,C.cream,2*scale);
    }
  }
  private drawFlame(g:Graphics,angle:number,originY=40) {
    for(let j=0;j<7;j++){
      const a=angle+(j-3)*.105,length=145+Math.sin(this.visualTime*29+j*1.8)*31+(3-Math.abs(j-3))*22;
      for(let layer=0;layer<2;layer++){
        const points:number[]=[],half=(layer?5:12),reach=length*(layer?.82:1);
        for(let i=0;i<=12;i++){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half;
          const bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend+w),originY+Math.sin(a)*r+Math.cos(a)*(bend+w));}
        for(let i=12;i>=0;i--){const t=i/12,r=32+t*reach,w=Math.sin(t*Math.PI)*half,bend=Math.sin(t*9-this.visualTime*34+j)*t*8;
          points.push(Math.cos(a)*r-Math.sin(a)*(bend-w),originY+Math.sin(a)*r+Math.cos(a)*(bend-w));}
        this.polygon(g,points,layer?'#FFD68ED9':'#EE7325B0');
      }
    }
    this.circle(g,Math.cos(angle)*37,originY+Math.sin(angle)*37,8,'#FFF1BA');
  }
  private polygon(g:Graphics,points:number[],color:string) {
    g.fillColor=new Color(color);g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.close();g.fill();
  }
  private drawVortex(g:Graphics,x:number,y:number,r:number,spin:number,heading=0,life=1) {
    if(g===this.overlay&&this.fireFrame){
      const n=this.sprite('Vortex preview',this.fireFrame,r*2.45,r*2.45,this.overlayNode);
      n.setPosition(x,y,0);n.angle=spin*180/Math.PI;this.emission(n.getComponent(Sprite)!);
      return;
    }
    const radius=r*(.96+Math.sin(spin*1.8)*.035)*(.65+.35*life);
    this.circle(g,x,y,radius*.87,'#FF80201B');
    // Open spiral ribbons leave enemy silhouettes visible between the flame arms.
    for(let arm=0;arm<3;arm++)for(let layer=0;layer<2;layer++){
      const points:number[]=[];
      for(let side=0;side<2;side++)for(let n=0;n<=27;n++){
        const t=(side?27-n:n)/27,a=spin+arm*Math.PI*2/3+t*4.9;
        const edge=Math.sin(t*32+spin*2)*t*.019;
        const width=(.028+.075*Math.sin(Math.PI*t))*(layer?.42:1)*(side?-1:1);
        const rr=radius*(.13+.83*t+width+edge);
        points.push(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
      }
      this.polygon(g,points,layer?'#FFE4A8ED':'#F58932D9');
    }
    for(let i=0;i<6;i++){
      const a=spin*.72+i*Math.PI/3, rr=radius*(.91+Math.sin(spin+i)*.07);
      this.line(g,[x+Math.cos(a)*rr,y+Math.sin(a)*rr,x+Math.cos(a-.17)*rr*1.07,y+Math.sin(a-.17)*rr*1.07],'#F5A348AA',3);
    }
    for(let i=0;i<3;i++){
      const a=heading+Math.PI+(i-1)*.3,rr=radius*(1.05+(Math.sin(spin+i)*.5+.5)*.35);
      this.line(g,[x+Math.cos(a)*radius*.72,y+Math.sin(a)*radius*.72,x+Math.cos(a)*rr,y+Math.sin(a)*rr],'#E7793048',radius*.07);
    }
    this.circle(g,x,y,radius*.115,'#FFF1BDB0');this.circle(g,x,y,radius*.055,'#FFFFFFD9');
  }
  /** Tapered painted contours bend independently from the textured light layer. */
  private ribbon(g:Graphics,x:number,y:number,angle:number,length:number,width:number,phase:number,color:string) {
    const points:number[]=[],dx=Math.cos(angle),dy=Math.sin(angle);
    for(let side=0;side<2;side++)for(let j=0;j<=12;j++){
      const u=(side?12-j:j)/12;
      const bend=Math.sin(u*5-phase)*width*.8*u;
      const edge=Math.sin(Math.PI*u)*width*(side?-1:1)*(.7+.21*Math.sin(u*9+phase)+.09*Math.sin(u*37+phase*.5));
      points.push(x+dx*u*length-dy*(bend+edge),y+dy*u*length+dx*(bend+edge));
    }
    this.polygon(g,points,color);
  }
  /** Short pigment lobes roll along the jet; no full-length stretched flame sprite. */
  private flameJet(x:number,y:number,angle:number,reach:number,phase:number,power:number,age?:number) {
    const dx=Math.cos(angle),dy=Math.sin(angle),length=Math.max(20,reach-37);
    const packet=age!==undefined,progress=age??0;
    // The attached core dies first, leaving detached tips to curl and cool.
    const core=packet?Math.max(0,1-progress*2.1):1;
    if(core>0){
      this.artEffect(3,x+dx*59,y+dy*59,55,24*power,angle*180/Math.PI,core*.65,'#F4D2A4');
      this.ribbon(this.attacks,x+dx*36,y+dy*36,angle,44,4*power,phase*12,'#FFF0C2'+Math.round(core*210).toString(16).padStart(2,'0'));
    }
    for(let j=0;j<5;j++){
      const u=packet?Math.min(1,.08+j*.11+progress*.62):.12+j*.17;
      const turn=phase*9-j*1.8,spread=(j%2?1:-1)*u*u*length*.19;
      const bend=spread+Math.sin(turn)*u*13;
      const cx=x+dx*(37+length*u)-dy*bend,cy=y+dy*(37+length*u)+dx*bend;
      const fade=(packet?Math.sin(Math.PI*progress):1)*(1-u*.65);
      const size=(22+u*48)*power,roll=angle+Math.sin(turn)*(.13+u*.35);
      const frame=this.flameFrames.length?8+Math.min(3,Math.floor((packet?progress:u)*4)):3;
      this.artEffect(frame,cx,cy,size*1.65,size*1.2,roll*180/Math.PI,fade*.65,'#F2C5AD');
      const inkAlpha=Math.round(fade*120).toString(16).padStart(2,'0');
      this.ribbon(this.attacks,cx-dx*size*.3,cy-dy*size*.3,roll,size*.85,size*.16,turn,'#D78672'+inkAlpha);
      this.ribbon(this.attacks,cx-dx*size*.3,cy-dy*size*.3,roll-.1,size*.68,size*.07,turn+.5,'#FFE3B2'+inkAlpha);
    }
    for(let j=0;j<5;j++){
      const u=packet?Math.min(1,progress*.75+.2+j*.035):(phase*1.7+j*.21)%1;
      const q=angle+Math.sin(j*9.3)*.28,distance=37+length*u;
      const cx=x+Math.cos(q)*distance,cy=y+Math.sin(q)*distance;
      const fade=Math.sin(Math.PI*u)*(packet?1-progress:1),alpha=Math.round(fade*185).toString(16).padStart(2,'0');
      this.ribbon(this.attacks,cx,cy,q+.35,7+u*9,1.5*power,phase*8+j,'#F2C59D'+alpha);
    }
  }
  private drawEffects() {
    const g=this.fx;g.clear();
    // The barrier is a persistent world-space state, not just a recharge flash.
    if(this.model.shieldHp>0){
      const ratio=this.model.shieldHp/this.model.maxShield;
      for(const y of [166,...this.slotY]){
        const alpha=Math.round(45+ratio*95).toString(16).padStart(2,'0');
        for(const side of [-1,1])this.line(g,[side*57,y+42,side*65,y+25,side*65,y-25,side*57,y-42],'#B5D3BE'+alpha,1.5+ratio);
      }
    }
    for(const e of this.supportEffects){
      const t=1-e.life/e.max;
      if(e.type==='ink-impact'||e.type==='shield-impact'){
        const color=e.color||C.gold,fade=Math.pow(1-t,1.5),alpha=Math.round(fade*230).toString(16).padStart(2,'0');
        const grow=1-Math.pow(1-t,3),radius=e.size*(.25+grow*.75);
        if(e.type==='shield-impact'){
          const points:number[]=[];for(let i=0;i<=12;i++){const angle=i/12*Math.PI*1.7;points.push(e.x+Math.cos(angle)*radius,e.y+Math.sin(angle)*radius*.8);}
          this.line(g,points,color+alpha,2.5);
        }else{
          const angle=Math.atan2(e.dy,e.dx)+.4;
          for(let i=0;i<4;i++){
            const q=angle+i*Math.PI*.5,r=radius*(i%2?.55:1);
            this.polygon(g,[e.x+Math.cos(q)*3,e.y+Math.sin(q)*3,e.x+Math.cos(q+.15)*r*.55,e.y+Math.sin(q+.15)*r*.55,e.x+Math.cos(q)*r,e.y+Math.sin(q)*r,e.x+Math.cos(q-.15)*r*.55,e.y+Math.sin(q-.15)*r*.55],color+alpha);
          }
          if(t<.45)this.circle(g,e.x,e.y,3*(1-t),C.cream+alpha);
        }
        continue;
      }
      if(e.type==='rail-beam'){
        const fade=Math.pow(1-t,1.8),color=e.recipeId?.includes('cryo')?'#B4DDEB':e.recipeId?.includes('acid')?'#D3D9A5':'#F4CC78';
        const length=Math.max(1,Math.hypot(e.dx,e.dy)),angle=Math.atan2(e.dy,e.dx);
        const width=(t<.12?1+t*5:1.6-t)*Math.max(3,e.size*.45),alpha=Math.round(fade*210).toString(16).padStart(2,'0');
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],color+Math.round(fade*52).toString(16).padStart(2,'0'),width*3.6);
        // Two offset pigment strokes make the beam read as a painted ribbon,
        // while the narrow ivory core preserves the high-energy focal line.
        this.ribbon(g,e.x,e.y,angle,length,width*.42,this.visualTime*18,color+alpha);
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#F4F1DD'+Math.round(fade*245).toString(16).padStart(2,'0'),Math.max(.6,width*.25));
        const ex=e.x+e.dx,ey=e.y+e.dy;
        this.artEffect(5,ex,ey,24+width*3,18+width*2,angle*180/Math.PI,fade*.7,color);
        this.artEffect(5,e.x,e.y,18+width*2,14+width,angle*180/Math.PI+180,fade*.45,color);
        // Paired rails and expanding muzzle rings distinguish this instant
        // piercing discharge from the travelling cannon shell.
        const nx=-Math.sin(angle),ny=Math.cos(angle),offset=5+9*t;
        for(const side of [-1,1])this.line(g,[e.x+nx*offset*side,e.y+ny*offset*side,ex+nx*offset*side,ey+ny*offset*side],color+alpha,Math.max(.5,2*(1-t)));
        for(let j=0;j<3;j++){
          const distance=42+j*55+t*30,cx=e.x+Math.cos(angle)*distance,cy=e.y+Math.sin(angle)*distance,r=10+8*t-j*2,points:number[]=[];
          for(let k=0;k<=16;k++){const q=k/16*Math.PI*2;points.push(cx+nx*Math.cos(q)*r+Math.cos(angle)*Math.sin(q)*r*.3,cy+ny*Math.cos(q)*r+Math.sin(angle)*Math.sin(q)*r*.3);}
          this.line(g,points,color+alpha,1.4*(1-t)+.4);
        }
      }else if(e.type==='shield-hit'||e.type==='shield-break'){
        const broken=e.type==='shield-break',alpha=Math.round((1-t)*220).toString(16).padStart(2,'0');
        for(const y of [166,...this.slotY])for(const side of [-1,1]){
          const x=side*(65+(broken?32:9)*t),shift=broken?t*28:0;
          this.line(g,[x,y+25-shift,x+side*7,y+9-shift,x,y-9-shift],(broken?C.gold:C.cream)+alpha,3*(1-t)+.5);
        }
      }else if(e.type==='train-shield'){
        const radius=22+65*t,points:number[]=[];
        for(let i=0;i<=32;i++){const q=i/32*Math.PI*2;points.push(e.x+Math.cos(q)*radius,e.y+Math.sin(q)*radius*.65);}
        this.line(g,points,C.gold+Math.round((1-t)*220).toString(16).padStart(2,'0'),3*(1-t)+.5);
        for(const y of [166,...this.slotY]){const arrival=Math.abs(y-e.y)/700,fade=Math.max(0,1-Math.abs(t-arrival)*2),w=56+8*t;
          this.line(g,[-w,y+38,-w-8,y+18,-w-8,y-24,-w,y-38],'#B9DCE2'+Math.round(fade*190).toString(16).padStart(2,'0'),2);
          this.line(g,[w,y+38,w+8,y+18,w+8,y-24,w,y-38],'#B9DCE2'+Math.round(fade*190).toString(16).padStart(2,'0'),2);}
      }else if(e.type==='flame'){
        this.flameJet(e.x,e.y,Math.atan2(e.dy,e.dx),e.size,this.visualTime,1,t);
      }else if(e.type==='cannon-impact'){
        const grow=1-Math.pow(1-t,3),r=e.size*grow;
        this.artEffect(5,e.x,e.y,30+e.size*1.7*grow,24+e.size*1.5*grow,t*17,(1-t)*.85,'#EDB080');
        for(let j=0;j<7;j++){
          const q=j*Math.PI*2/7+e.x*.03,spread=r*(.8+(j%3)*.12);
          const x=e.x+Math.cos(q)*spread,y=e.y+Math.sin(q)*spread;
          this.ribbon(g,x,y,q+Math.PI/2,7+12*grow,3*(1-t),j,'#D5AB8E88');
          this.line(g,[e.x+Math.cos(q)*r*.5,e.y+Math.sin(q)*r*.5,x,y],'#EAC9A7AA',2*(1-t)+.5);
        }
      }else if(e.type==='repair'||e.type==='passive-repair'){
        for(const y of this.slotY)for(let j=0;j<3;j++){
          const u=(t+j/3)%1,x=-44+j*44,py=y-30+u*80,alpha=Math.round(Math.sin(Math.PI*u)*(1-t)*210).toString(16).padStart(2,'0');
          this.line(g,[x-5,py,x+5,py],'#A8DADE'+alpha,3);
          this.line(g,[x,py-5,x,py+5],'#A8DADE'+alpha,3);
        }
      }else if(e.type==='feed'){
        const color=e.color||C.teal,travel=Math.min(1,t*3.5),side=e.dy>0?-56:56,points:number[]=[];
        for(let j=0;j<=16;j++){
          const u=j/16;points.push(e.x+Math.sin(Math.PI*u)*side,e.y+e.dy*u);
        }
        this.line(g,points,color+'33',2);
        for(let i=0;i<4;i++){
          const u=Math.max(0,travel-i*.07),x=e.x+Math.sin(Math.PI*u)*side,y=e.y+e.dy*u;
          this.line(g,[x-3,y,x,y+5,x+3,y,x,y-5,x-3,y],color,1.5);
        }
        const charge=1-Math.min(1,t/.35);
        this.artEffect(4,e.x+e.dx,e.y+e.dy,46+charge*60,64+charge*55,-this.visualTime*45,Math.sin(Math.PI*t)*.72);
      }else if(e.type==='wind-impact'){
        const length=Math.max(1,Math.hypot(e.dx,e.dy)),dx=e.dx/length,dy=e.dy/length;
        const reach=14+36*t,alpha=Math.round((1-t)*220).toString(16).padStart(2,'0');
        for(const side of[-1,1])this.line(g,[e.x-dx*12-dy*side*reach,e.y-dy*12+dx*side*reach,e.x+dx*10,e.y+dy*10,e.x+dx*24-dy*side*reach*.5,e.y+dy*24+dx*side*reach*.5],'#BDE7E0'+alpha,2);
        this.artEffect(0,e.x,e.y,62+25*t,23,Math.atan2(dy,dx)*180/Math.PI,(1-t)*.7,'#C5EBDE');
      }else if(e.type==='thermal-shot'){
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#FF814E99',8*(1-t)+2);
        this.line(g,[e.x,e.y,e.x+e.dx,e.y+e.dy],'#FFEACD',2);
      }else if(e.type==='tesla'){
        const points:number[]=[];const length=Math.max(1,Math.hypot(e.dx,e.dy));
        for(let i=0;i<=6;i++){const p=i/6,offset=i===0||i===6?0:Math.sin(i*5+this.visualTime*55)*13;
          points.push(e.x+e.dx*p-e.dy/length*offset,e.y+e.dy*p+e.dx/length*offset);}
        this.line(g,points,'#B2A1DC77',5*(1-t)+1);this.line(g,points,'#D6F4F3',1.5);
        this.artEffect(5,e.x+e.dx,e.y+e.dy,45*(1-t)+12,70*(1-t)+12,35,.55*(1-t));
      }else if(e.type==='prismbeam'){
        const angle=Math.atan2(e.dy,e.dx);
        for(const offset of[-.32,0,.32])this.flameJet(e.x,e.y,angle+offset,e.size,this.visualTime,.55);
      }else if(e.type==='beam'||e.type==='wind'){
        const angle=Math.atan2(e.dy,e.dx),reach=e.size||260;
        if(e.type==='beam'){this.flameJet(e.x,e.y,angle,reach,this.visualTime,.6);continue;}
        for(let j=0;j<3;j++){
          const u=Math.max(0,Math.min(1,(t-j*.10)/.8));if(u<=0)continue;
          const grow=1-Math.pow(1-u,3),q=angle+(j-1)*.14+Math.sin(u*4+j)*.035;
          const radius=25+grow*reach*.64,fade=Math.sin(Math.PI*u)*.42;
          this.artEffect(1,e.x+Math.cos(q)*radius,e.y+Math.sin(q)*radius,34+grow*reach*.5,26+grow*reach*.48,q*180/Math.PI+(j-1)*9,fade);
          this.ribbon(g,e.x+Math.cos(q)*30,e.y+Math.sin(q)*30,q,radius,3+j,u*8+j,'#A8DADE77');
        }
        continue;
      }else if(['acid','prism','regen','shield','brood'].includes(e.type)){
        const color=e.type==='acid'?'#D4C78BAA':e.type==='prism'?'#D4B8E9BB':e.type==='regen'?'#D6C5AABB':e.type==='shield'?'#ACCEDCAA':'#D09DADAA';
        for(let j=0;j<5;j++){
          const q=j*Math.PI*.4+e.x*.01,r=(e.size||40)*(.15+.65*t),x=e.x+Math.cos(q)*r,y=e.y+Math.sin(q)*r;
          this.ribbon(g,x,y,q+Math.PI/2,12+18*Math.sin(Math.PI*t),3*(1-t),j+t*5,color);
        }
      }else{
        const index=e.type==='cryo'||e.type==='iceblast'?2:e.type==='thermalburst'?7:5;
        const size=e.type==='impact'?e.size:e.type==='slam'?240:Math.max(50,e.size*2);
        if(index===2){
          const grow=1-Math.pow(1-t,3),r=size*.42;
          this.artEffect(2,e.x,e.y,size*(.35+.65*grow),size*(.35+.65*grow),t*8,(1-t)*.28);
          for(let j=0;j<7;j++){
            const u=Math.max(0,(t-(j%3)*.035)/.92),q=j*Math.PI*2/7+e.x*.01;
            const distance=r*(.25+.75*(1-Math.pow(1-u,3))),cx=e.x+Math.cos(q)*distance,cy=e.y+Math.sin(q)*distance;
            const h=(9+j%3*4)*Math.sin(Math.PI*Math.min(1,u)),w=h*.26;
            this.polygon(g,[cx+Math.cos(q)*h,cy+Math.sin(q)*h,cx-Math.sin(q)*w,cy+Math.cos(q)*w,cx-Math.cos(q)*h*.5,cy-Math.sin(q)*h*.5,cx+Math.sin(q)*w,cy-Math.cos(q)*w],'#BCDDEBC0');
          }
          continue;
        }
        const pop=t<.18?.35+t*4:1.07-(t-.18)*.44;
        this.artEffect(index,e.x,e.y,size*pop,size*pop*(.72+.28*Math.sin(t*Math.PI)),index===7?t*24:0,Math.pow(1-t,1.6));
        for(let j=0;j<5;j++){
          const q=j*Math.PI*2/5+e.x*.03,r=size*.55*(1-Math.pow(1-t,2));
          this.line(g,[e.x+Math.cos(q)*r*.75,e.y+Math.sin(q)*r*.75,e.x+Math.cos(q)*r,e.y+Math.sin(q)*r],index===7?'#BBCFE999':'#E6B99D99',2*(1-t)+.5);
        }
        continue;
      }
    }
    for(const p of this.particles){
      const fade=Math.max(0,Math.min(1,p.life/p.max)),r=Math.max(.5,p.size*fade);
      const pigment=new Color(p.color);pigment.a=Math.round(255*fade);g.fillColor=pigment;
      g.moveTo(p.x-r,p.y-r*.2);g.lineTo(p.x+r*.55,p.y+r*.7);g.lineTo(p.x+r*.8,p.y-r*.45);g.lineTo(p.x-r*.6,p.y-r*.6);g.close();g.fill();
    }
    let digitUsed=0;
    const occupied:{x:number;y:number;w:number;h:number}[]=[];
    const priority={incoming:0,heavy:1,shield:2,normal:3,tick:4};
    const shownChannels=new Set<string>(),shownKinds={incoming:0,heavy:0,shield:0,normal:0,tick:0};
    const limits={incoming:2,heavy:4,shield:2,normal:6,tick:4};
    for(const number of [...this.damageNumbers.items].sort((a,b)=>priority[a.kind]-priority[b.kind]||a.age-b.age)){
      if(!this.digitFrames.length)break;
      if(occupied.length>=14)break;
      if(shownChannels.has(number.key)||shownKinds[number.kind]>=limits[number.kind])continue;
      const text=(number.incoming?'-':'')+String(Number(number.amount.toFixed(number.amount<10?1:0)));
      const pose=damageNumberPresentation(number),heavy=number.kind==='heavy';
      const incoming=number.kind==='incoming',tick=number.kind==='tick';
      const size=(incoming?40:heavy?48:tick?30:number.shield?34:36)*(this.lowMotion?1:pose.scale);
      const fade=pose.alpha;
      const rise=this.lowMotion?0:pose.rise;
      let y=number.y+rise;
      const advance=(char:string)=>char==='.'?size*.34:char==='-'?size*.65:char==='1'?size*.52:size*.72;
      // Array.from preserves characters under Creator's loose string-spread transform.
      const width=Array.from(text).reduce((sum,c)=>sum+advance(c),0);
      let x=Math.max(-310+width/2,Math.min(310-width/2,number.x+(this.lowMotion?0:pose.offsetX)));
      // Reserve full slanted glyph extents and the adjacent semantic mark, not just advances.
      const idealX=x,idealY=y,h=size,w=width+size*.5;
      let placed=false;
      for(let attempt=0;attempt<18;attempt++){
        const row=Math.floor(attempt/3),side=attempt%3===0?0:attempt%3===1?-1:1;
        x=Math.max(-310+w/2,Math.min(310-w/2,idealX+side*(w+12)));
        y=Math.max(-392+h/2,Math.min(195-h/2,idealY-row*(h+10)));
        if(!occupied.some(p=>Math.abs(p.x-x)<(p.w+w)/2+12&&Math.abs(p.y-y)<(p.h+h)/2+10)){placed=true;break;}
      }
      // Dense low-priority floats yield space instead of obscuring higher-priority feedback.
      if(!placed)continue;
      occupied.push({x,y,w,h});
      shownChannels.add(number.key);shownKinds[number.kind]++;
      const tilt=this.lowMotion?0:pose.tilt;
      const alpha=Math.round(fade*255).toString(16).padStart(2,'0');
      if(incoming)this.line(g,[x-width/2,y-23,x+width/2,y-23],'#F18788'+alpha,2);
      if(tick)this.circle(g,x-width/2-6,y,1.5,'#D3C0EA'+alpha);
      if(heavy&&number.age<.24){
        const strength=(1-number.age/.24)*fade;
        const pigment=number.color+Math.round(90*strength).toString(16).padStart(2,'0');
        this.line(g,[x-width*.55-8,y-13,x+width*.5+12,y+14],pigment,1.5);
        if(!this.lowMotion)this.line(g,[x+width*.5+3,y+18,x+width*.5+16+number.age*30,y+25],pigment,1);
      }
      let cursor=-width/2;
      for(const char of text){
        const frame=this.digitFrames[pose.atlasRow*12+'0123456789.-'.indexOf(char)];if(!frame)continue;
        let node=this.digitSprites[digitUsed++];
        if(!node){node=this.sprite('Damage ink',frame,36,48,this.fx.node);this.digitSprites.push(node);}
        node.active=true;node.setPosition(x+cursor+advance(char)/2,y+(cursor+advance(char)/2)*Math.sin(tilt*Math.PI/180),0);node.angle=tilt;
        node.getComponent(UITransform)!.setContentSize(size*frame.rect.width/frame.rect.height,size);
        const sprite=node.getComponent(Sprite)!;sprite.spriteFrame=frame;
        const color=new Color('#FFFFFF');color.a=Math.round(255*fade);sprite.color=color;
        cursor+=advance(char);
      }
      if(number.shield)this.line(g,[x-width/2-16,y+7,x-width/2-6,y+7,x-width/2-7,y-3,x-width/2-11,y-7,x-width/2-16,y-3,x-width/2-16,y+7],number.color+Math.round(fade*255).toString(16).padStart(2,'0'),2);
    }
    for(let i=digitUsed;i<this.digitSprites.length;i++)this.digitSprites[i].active=false;
  }
  private drawHUD() {
    const g=this.hud,m=this.model;g.clear();
    const fighting=m.phase==='combat',power=m.buildPower,burst=power.overdrive;
    if(this.hudVeil)this.hudVeil.active=false;
    for(const key of ['hp','shield','kills','build','milestone','power','form','hint','toast','chain','boss','reorder','tag','time'])this.labels[key].node.active=fighting;
    this.labels.stage.node.active=false;this.labels.brand.node.active=!this.lastLightTitle&&m.phase!=='menu';
    if(this.lastLightTitle){this.lastLightTitle.active=m.phase!=='menu';this.lastLightTitle.setPosition(-236,576,0);this.lastLightTitle.getComponent(UITransform)!.setContentSize(220,90);this.lastLightTitle.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}
    if(this.lastLightTicket){this.lastLightTicket.active=fighting;this.lastLightTicket.setPosition(0,-493,0);this.lastLightTicket.getComponent(UITransform)!.setContentSize(704,218);this.lastLightTicket.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}
    if(this.lastLightReorder){this.lastLightReorder.active=fighting;this.lastLightReorder.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}
    this.labels.brand.string='末日列车';this.labels.brand.node.setPosition(-309,570,0);this.labels.brand.fontSize=40;
    // Deliberately local information panels leave the sunset and the center lane open.
    if(fighting){
      this.rect(g,-324,348,232,173,'#0C272AB8',1);
      this.rect(g,-308,492,217,31,'#A83D2BEA',1);
      this.rect(g,-307,408,206,5,'#F1DEB633',0);
      this.rect(g,-307,408,206*Math.max(0,m.hp/m.maxHp),5,m.hp>30?C.cream:C.red,0);
    }
    const elapsed=Math.floor(m.time+.00001);
    this.labels.time.string=Math.floor(elapsed/60).toString().padStart(2,'0')+':'+(elapsed%60).toString().padStart(2,'0');
    this.labels.time.node.setPosition(-217,457,0);this.labels.time.node.getComponent(UITransform)!.setContentSize(204,67);this.labels.time.fontSize=50;this.labels.time.font=null;this.labels.time.useSystemFont=true;this.labels.time.fontFamily='Georgia';this.labels.time.color=new Color(C.cream);
    this.labels.tag.node.setPosition(-298,508,0);this.labels.tag.node.getComponent(UITransform)!.setContentSize(217,32);this.labels.tag.fontSize=20;
    this.labels.tag.string=(m.worldState.id==='city'?'雨巷':m.worldState.name)+' / 第 '+String(m.wave).padStart(2,'0')+' 波';this.labels.tag.color=new Color(C.cream);
    this.labels.hp.node.setPosition(-307,385,0);this.labels.hp.fontSize=20;this.labels.hp.string='装甲 '+Math.ceil(m.hp)+' / '+m.maxHp;
    this.labels.shield.node.setPosition(-211,357,0);this.labels.shield.fontSize=17;this.labels.shield.color=new Color(C.teal);this.labels.shield.string='护盾 '+Math.ceil(m.shieldHp)+' / '+m.maxShield;
    this.labels.kills.node.setPosition(260,545,0);this.labels.kills.fontSize=18;this.labels.kills.string='击破 '+m.kills;
    const xp=m.carRewardProgress;
    this.labels.form.node.active=fighting;this.labels.milestone.node.active=fighting;
    this.labels.form.node.setPosition(182,502,0);this.labels.form.fontSize=17;this.labels.form.color=new Color(C.cream);this.labels.form.string='车厢经验 '+xp.current+' / '+xp.required;
    this.labels.milestone.node.setPosition(182,457,0);this.labels.milestone.fontSize=17;this.labels.milestone.color=new Color(C.gold);this.labels.milestone.string='词条整备 '+Math.ceil(m.modifierWait)+'秒';
    if(fighting){this.rect(g,82,483,205,4,C.cream+'33');this.rect(g,82,483,205*xp.ratio,4,C.gold);}
    this.labels.build.node.setPosition(-292,-461,0);this.labels.build.fontSize=18;this.labels.build.color=new Color(C.gold);this.labels.build.string=m.links.length+' 条光路 / '+m.buildIdentity;
    this.labels.build.node.getComponent(UITransform)!.setContentSize(296,31);
    this.labels.power.node.setPosition(157,-461,0);this.labels.power.fontSize=17;this.labels.power.color=new Color(C.cream);this.labels.power.node.getComponent(UITransform)!.setContentSize(265,31);
    this.labels.power.string=burst.active?burst.name+' · '+burst.remaining.toFixed(1)+'秒':burst.eligible?burst.name+' · '+Math.ceil(burst.cooldown)+'秒':power.summary;
    this.labels.reorder.node.setPosition(0,-511,0);this.labels.reorder.node.getComponent(UITransform)!.setContentSize(352,66);this.labels.reorder.fontSize=33;this.labels.reorder.string='调整编组';this.labels.reorder.color=new Color(C.cream);
    if(fighting){
      if(!this.lastLightReorder)this.polygon(g,[-190,-542,-169,-477,190,-477,169,-542],'#AC3D2DF5');
      const frames=m.slots.map(car=>car?this.weaponFrames.get(car.type):undefined);
      for(let i=0;i<5;i++){
        const x=-236+i*118,y=-433;
        if(i<4)this.line(g,[x+24,y-12,x+94,y-12],m.links.some(l=>l.index===i)?'#F8DB88':'#8C967355',2);
        this.circle(g,x,y-12,3,m.slots[i]?C.gold:'#819382');
        const frame=frames[i];let n=this.lastLightFooterIcons[i];
        if(frame&&!n){n=this.sprite('Ticket module',frame,42,52,this.node);n.setSiblingIndex(this.overlayNode.getSiblingIndex());this.lastLightFooterIcons[i]=n;}
        if(n){n.active=!!frame;if(frame){n.getComponent(Sprite)!.spriteFrame=frame;n.getComponent(Sprite)!.customMaterial=this.unitMaterial;n.getComponent(UITransform)!.setAnchorPoint(.5,.5);n.getComponent(UITransform)!.setContentSize(47*frame.rect.width/frame.rect.height,47);n.setPosition(x,y+13,0);}}
      }
    }else for(const n of this.lastLightFooterIcons)if(n)n.active=false;
    this.labels.hint.node.setPosition(-294,-564,0);this.labels.hint.fontSize=16;this.labels.hint.node.getComponent(UITransform)!.setContentSize(575,27);
    this.labels.hint.string='击破积累经验选车厢 · 每30秒 / 击败精英选词条';
    this.rect(g,-360,-640,720,58,'#0B2429F0');this.line(g,[-320,-583,320,-583],'#D4BB803D',1);
    for(const [i,key]of ['footer','motion','speed','numbers','pause'].entries()){this.labels[key].node.setPosition(-288+i*144,-612,0);this.labels[key].fontSize=17;}
    this.labels.footer.string='声音 '+(this.sound?'开':'关');this.labels.motion.string='动态 '+(this.lowMotion?'静':'开');this.labels.speed.string='倍速 ×'+this.debugSpeed;this.labels.numbers.string='跳字 '+(this.showDamage?'开':'关');this.labels.pause.string=m.phase==='paused'?'继续 ▶':'暂停 Ⅱ';
    this.labels.toast.node.setPosition(0,-353,0);this.labels.toast.fontSize=19;this.labels.toast.string=this.toastLife>0?this.toastText:'';
    if(fighting&&this.toastLife>0)this.rect(g,-275,-372,550,36,'#102B2DDB',1);
    this.labels.windLesson.node.active=fighting&&this.windLessonLife>0;this.labels.windLesson.node.setPosition(0,-380,0);this.labels.windLesson.fontSize=18;this.labels.windLesson.string=this.windLessonText;
    this.labels.chain.node.setPosition(246,412,0);this.labels.chain.fontSize=24;this.labels.chain.string=this.chain>=4?this.chain+' 连破':'';
    this.labels.boss.node.setPosition(120,490,0);this.labels.boss.fontSize=20;this.labels.boss.node.getComponent(UITransform)!.setContentSize(360,38);this.labels.boss.string=m.boss?'执伞者 '+Math.ceil(m.boss.hp)+' / '+Math.ceil(m.boss.maxHp):'';
    if(m.boss&&fighting){this.rect(g,12,465,298,4,'#142C2F');this.rect(g,12,465,298*Math.max(0,m.boss.hp/m.boss.maxHp),4,C.red);}
  }
  private button(text:string,x:number,y:number,w:number,h:number,action:()=>void,accent=true) {
    const frame=this.lastLightUi[accent?3:1];
    if(frame){const n=this.sprite(accent?'Vermilion ticket action':'Railway ticket action',frame,w,h,this.overlayNode);n.setPosition(x,y,0);n.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}
    else this.rect(this.overlay,x-w/2,y-h/2,w,h,accent?'#A83D2B':'#163639',2);
    const caption=text.replace(/[→↔]/g,'').trim();
    this.label(this.overlayNode,caption,x-(accent?8:0),y,26,C.cream,w-58,'center','display');
    this.hitAreas.push({x,y,w,h,action});
  }
  private slotClick(index:number) {
    const m=this.model;
    this.replacementConfirmed=false;
    if(m.pendingCar){this.selectedSlot=index;return;}
    if(this.selectedSlot<0){this.selectedSlot=index;return;}
    if(this.selectedSlot!==index)m.swapSlots(this.selectedSlot,index);
    this.selectedSlot=-1;
  }
  /**
   * Cards use an equipment emblem rather than a tiny carriage pasted over a
   * coloured rectangle.  The irregular paper medallion gives every sprite a
   * common visual language while leaving the hand-painted silhouette visible.
   */
  private workshopCar(type:CarType,x:number,y:number,size:number,key:string) {
    let motion=this.workshopPositions.get(key);
    if(!motion){motion={x:key==='pending'&&!this.lowMotion?-190:x,y:key==='pending'&&!this.lowMotion?252:y,targetX:x,targetY:y,nodes:[]};this.workshopPositions.set(key,motion);}
    motion.targetX=x;motion.targetY=y;
    const count=this.overlayNode.children.length;
    this.cardIcon(type,x,y,size);
    motion.nodes=this.overlayNode.children.slice(count);
    for(const node of motion.nodes)node.setPosition(motion.x,motion.y,0);
  }
  private cardIcon(type:CarType,x:number,y:number,size:number) {
    const frame=this.weaponFrames.get(type);if(!frame)return;
    const workshop=this.model.phase==='workshop'&&!this.atlas&&size>=80;
    if(workshop&&this.hullFrame){
      const h=size*1.05,hull=this.sprite('Workshop sunlight carriage',this.hullFrame,h*this.hullFrame.rect.width/this.hullFrame.rect.height,h,this.overlayNode);
      hull.setPosition(x,y,0);hull.getComponent(Sprite)!.customMaterial=this.unitMaterial;
    }
    const h=type==='fan'?size*.7:size*.94;
    const n=this.sprite('Sunlight module '+type,frame,h*frame.rect.width/frame.rect.height,h,this.overlayNode);
    n.setPosition(x,y,0);n.getComponent(UITransform)!.setAnchorPoint(.5,.5);n.getComponent(Sprite)!.customMaterial=this.unitMaterial;
  }

  /** A readable hand-drawn fallback while an optional modifier atlas loads. */
  private drawModIcon(type:ModId|'repair',x:number,y:number,size:number) {
    const accent=(type==='repair'||type==='repairkit')?C.teal:
      type==='fuel'?'#F08B50':type==='coolant'?'#9DDBEA':type==='voltage'||type==='surge'||type==='capacitor'?C.teal:
      type==='acidpotency'?'#C7D98B':type==='prismfocus'?'#F4DB9F':type==='lanes'||type==='railpower'?'#C8D4DE':C.gold;
    const r=size*.43;this.paintRect(this.overlay,x-r,y-r,r*2,r*2,'#1C2633B8');
    const g=this.overlay;g.strokeColor=new Color(accent+'AA');g.lineWidth=Math.max(1.4,size*.018);g.circle(x,y,r*.84);g.stroke();
    const s=size/100;
    if(type==='repair'||type==='repairkit'){
      this.line(g,[x-25*s,y,x+25*s,y],accent,6*s);this.line(g,[x,y-25*s,x,y+25*s],accent,6*s);
      this.line(g,[x-26*s,y+22*s,x-5*s,y+3*s,x+4*s,y+12*s,x+28*s,y-15*s],C.cream,4*s);
    }else if(type==='lanes'||type==='railpower'){
      for(const off of[-13,0,13])this.line(g,[x-29*s,y+off*s,x+29*s,y+off*s],accent,4*s);
      this.line(g,[x-31*s,y-22*s,x-20*s,y-30*s,x-7*s,y-22*s],C.cream,2*s);
    }else if(type==='reach'){
      this.line(g,[x-28*s,y+10*s,x+24*s,y+10*s],accent,10*s);this.line(g,[x+18*s,y-3*s,x+35*s,y+10*s,x+18*s,y+23*s],C.cream,3*s);
      this.line(g,[x-27*s,y-10*s,x-4*s,y-10*s],C.cream,3*s);
    }else if(type==='fuel'){
      this.polygon(g,[x-8*s,y+27*s,x-22*s,y+2*s,x-8*s,y-9*s,x-4*s,y-30*s,x+13*s,y-7*s,x+23*s,y+3*s,x+8*s,y+27*s],'#E97843CC');
      this.line(g,[x-3*s,y+17*s,x+5*s,y+2*s,x+2*s,y-12*s],C.cream,3*s);
    }else if(type==='voltage'||type==='surge'||type==='capacitor'){
      this.line(g,[x-25*s,y-14*s,x-8*s,y-14*s,x-17*s,y+5*s,x+3*s,y+5*s,x-7*s,y+26*s,x+27*s,y-2*s,x+10*s,y-2*s,x+20*s,y-23*s],accent,4*s);
      this.circle(g,x-25*s,y-14*s,3*s,C.cream);this.circle(g,x+27*s,y-2*s,3*s,C.cream);
    }else if(type==='caliber'||type==='rapid'||type==='scatter'||type==='burst'){
      for(const off of[-16,0,16]){this.circle(g,x+off*s,y-3*s,7*s,'#A5A69A');this.line(g,[x+off*s-3*s,y-17*s,x+off*s+3*s,y-17*s],accent,3*s);}
      if(type==='burst')this.line(g,[x-28*s,y+22*s,x-7*s,y+22*s,x+3*s,y+10*s,x+26*s,y+10*s],C.cream,3*s);
    }else if(type==='prismfocus'){
      this.polygon(g,[x,y-29*s,x+22*s,y,x,y+29*s,x-22*s,y],accent+'CC');
      this.line(g,[x-35*s,y+18*s,x-8*s,y,x-35*s,y-18*s],C.cream,2*s);this.line(g,[x+35*s,y-18*s,x+8*s,y,x+35*s,y+18*s],C.cream,2*s);
    }else if(type==='acidpotency'){
      this.line(g,[x-12*s,y-27*s,x+12*s,y-27*s,x+8*s,y-17*s,x+19*s,y+22*s,x-19*s,y+22*s,x-8*s,y-17*s,x-12*s,y-27*s],accent,4*s);
      this.circle(g,x-7*s,y+7*s,3*s,C.cream);this.circle(g,x+8*s,y+1*s,4*s,accent);
    }else{
      this.circle(g,x,y,17*s,'#9E8D68');this.circle(g,x,y,8*s,'#1C2633');
      for(let i=0;i<6;i++){const a=i*Math.PI/3;this.circle(g,x+Math.cos(a)*23*s,y+Math.sin(a)*23*s,5*s,accent);}
    }
  }
  private drawPanel() {
    for(const p of this.workshopPositions.values())p.nodes=[];
    if(this.model.phase!=='workshop')this.workshopPositions.clear();
    for(const n of this.overlayNode.children.slice())n.destroy();
    this.overlay.clear();this.hitAreas=[];
    const m=this.model,g=this.overlay;
    if(this.lastLightPanel){this.lastLightPanel.active=m.phase!=='combat'&&(m.phase!=='menu'||this.atlas||this.garageOpen);this.lastLightPanel.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}
    if(this.menuArt)this.menuArt.active=m.phase==='menu'&&!this.atlas&&!this.garageOpen;
    if(this.paperArt)this.paperArt.active=false;
    if(this.workshopArt)this.workshopArt.active=false;
    if(this.stationArt)this.stationArt.active=false;
    if(m.phase==='combat'){
      this.hitAreas.push({x:0,y:-511,w:390,h:70,action:()=>this.openWorkshop()});
      return;
    }
    renderPanel({model:m,knownRecipes:this.knownRecipes,newRecipes:this.newRecipes,
      garageOpen:this.garageOpen,garage:this.garage,
      atlas:this.atlas,atlasPage:this.atlasPage,atlasCars:this.atlasCars,selectedSlot:this.selectedSlot,
      replacementConfirmed:this.replacementConfirmed,assembling:this.assemblyRemaining>0,
      draw:{
        rect:(x,y,w,h,color,radius)=>{if(w>=610&&h>=700&&this.lastLightPanel)return;this.rect(g,x,y,w,h,color,radius);},
        label:(text,x,y,size,color,width,align,font)=>{if(text==='末日列车'&&this.lastLightUi[0]){const n=this.sprite('Calligraphic title',this.lastLightUi[0],450,183,this.overlayNode);n.setPosition(x,y,0);n.getComponent(Sprite)!.customMaterial=this.chassisMaterial;}else this.label(this.overlayNode,text,x,y,size,color,width,align,font);},
        art:(name)=>{if(name==='workshop'){if(this.workshopArt)this.workshopArt.active=true;else if(this.paperArt)this.paperArt.active=true;}else if(name==='station'){if(this.stationArt)this.stationArt.active=true;else if(this.paperArt)this.paperArt.active=true;}else if(name==='paper'){if(this.paperArt)this.paperArt.active=true;}else if(this.menuArt)this.menuArt.active=true;},
        button:(text,x,y,w,h,action,accent)=>this.button(text,x,y,w,h,action,accent),
        cardIcon:(type,x,y,size)=>this.cardIcon(type,x,y,size),
        carriage:(type,x,y,size,key)=>this.workshopCar(type,x,y,size,key),
        engineIcon:(id,x,y,size)=>{
          const frame=this.engineFrames.get(id);
          if(frame){const n=this.sprite(ENGINES[id].name,frame,size*.72,size,this.overlayNode);n.setPosition(x,y,0);}
          else this.cardIcon(ENGINES[id].starter,x,y,size);
        },
        modIcon:(type,x,y,size)=>{
          const frame=this.modFrames.get(type);
          if(frame){
            this.paintRect(this.overlay,x-size*.48,y-size*.48,size*.96,size*.96,'#1C2633B8');
            const n=this.sprite('Modification',frame,size*.82,size*.82,this.overlayNode);n.setPosition(x,y,0);
            n.getComponent(UITransform)!.setAnchorPoint(.5,.5);
            n.getComponent(Sprite)!.color=new Color(255,255,255,238);
          }else this.drawModIcon(type,x,y,size);
        },
        line:(points,color,width)=>this.line(g,points,color,width),
        circle:(x,y,r,color)=>this.circle(g,x,y,r,color),
        addHitArea:(x,y,w,h,action)=>{this.hitAreas.push({x,y,w,h,action});}
      },actions:{
        begin:()=>this.begin(),selectSlot:i=>this.slotClick(i),
        openGarage:()=>{this.finishRun();this.garageOpen=true;this.atlas=false;},
        closeGarage:()=>{this.garageOpen=false;},
        chooseEngine:id=>{this.garage=selectGarageLoadout(this.garage,{...this.garage.loadout,engine:id});this.saveGarage();},
        chooseModule:id=>{this.garage=selectGarageLoadout(this.garage,{...this.garage.loadout,module:id});this.saveGarage();},
        openWorkshop:()=>this.openWorkshop(),
        setAtlas:(open,page,cars)=>{this.replacementConfirmed=false;this.atlas=open;this.atlasPage=page;if(cars!==undefined)this.atlasCars=cars;},
        manualPlacement:()=>{this.selectedSlot=-1;this.replacementConfirmed=false;},
        confirmReplacement:()=>{this.replacementConfirmed=true;},
        cancelReplacement:()=>{this.replacementConfirmed=false;},
        installPending:depart=>{
          if(m.slots.every(Boolean)&&!this.replacementConfirmed)return;
          const index=this.selectedSlot;
          if(m.install(index)){
            const pending=this.workshopPositions.get('pending');
            if(pending){this.workshopPositions.set(`car:${m.slots[index]!.id}`,pending);this.workshopPositions.delete('pending');}
            this.selectedSlot=-1;this.replacementConfirmed=false;
            this.assemblyRemaining=this.lowMotion?.16:.65;this.assemblyDepart=!!depart;this.tone(430,.10,'triangle');
          }
        },
        mergePending:()=>{if(m.mergePending(this.selectedSlot)){this.selectedSlot=-1;this.toast('同车合并 · 强化升级');}},
        chooseOffer:i=>{this.selectedSlot=-1;this.replacementConfirmed=false;this.atlas=false;
          if(m.chooseOffer(i)&&m.pendingCar)this.selectedSlot=recommendSlot(m,m.pendingCar);},
        discardOffer:()=>{m.discardOffer();this.selectedSlot=-1;},
        resumeWorkshop:()=>{this.selectedSlot=-1;m.resumeWorkshop();},
        resume:()=>m.resume(),backToMenu:()=>{this.finishRun();m.phase='menu';this.atlas=false;this.garageOpen=false;}
      }
    });
    if(m.phase==='menu'&&!this.atlas&&!this.garageOpen){
      const frame=this.engineFrames.get(this.garage.loadout.engine);
      if(frame){const n=this.sprite('Departure sunlight engine',frame,350*frame.rect.width/frame.rect.height,350,this.overlayNode);n.setPosition(90,85,0);n.getComponent(Sprite)!.customMaterial=this.unitMaterial;}
      if(this.hullFrame){const n=this.sprite('Departure carriage',this.hullFrame,85,125,this.overlayNode);n.setPosition(90,-159,0);n.getComponent(Sprite)!.customMaterial=this.unitMaterial;}
      const prism=this.weaponFrames.get('prism');if(prism){const n=this.sprite('Departure light crystal',prism,110*prism.rect.width/prism.rect.height,110,this.overlayNode);n.setPosition(90,-159,0);n.getComponent(Sprite)!.customMaterial=this.unitMaterial;}
    }
    if(m.phase==='win'||m.phase==='lose')try{
      globalThis.localStorage?.setItem('doomsday-last-run',JSON.stringify({version:'0.5.1',wave:m.wave,seed:m.initialSeed,
        slots:m.slots.map(c=>c?{type:c.type,level:c.level}:null),links:m.links.map(l=>l.recipe.id),
        hp:m.hp,kills:m.kills,time:m.time,result:m.phase,reason:m.endReason,events:m.events}));
    }catch{}
  }
}
