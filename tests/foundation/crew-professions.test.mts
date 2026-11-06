import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {
  collectionGoal,contributionTarget,effectiveProfession,eligibleProfessionAreas,professionalFloor,
  professionalTargets,professionIds,professionLevel,professionRules,professionWeek,selectProfessionalTarget,
} from '../../apps/game-server/src/characters/crew-profession-rules.js';

test('weekly XP profiles keep the 11-cycle and 13-cycle minimums',()=>{
  const {weeklyLimit,xp,xpProfile}=professionRules;
  assert.equal(professionLevel(0),1);
  assert.equal(professionLevel(10*weeklyLimit),9);
  assert.equal(professionLevel(xp[9]!-1),9);
  assert.equal(professionLevel(xp[9]!),10);
  for(const profile of Object.values(xpProfile)){
    assert.equal(Object.values(profile).reduce((total,value)=>total+value,0),weeklyLimit);
    assert.equal(Math.ceil(xp[9]!/(weeklyLimit-profile.donation)),13);
    assert(profile.collection>profile.hunt);
  }
  const first=professionWeek(Date.parse('2026-11-01T23:59:59.999Z'));
  assert.equal(first.key,'2026-10-26');
  const eleventh=professionWeek(first.start+10*(first.end-first.start));
  assert.equal((eleventh.start-first.end)/86_400_000,63);
});

test('donation uses whole days, remaining quota on the first day and no free objective',()=>{
  const week=professionWeek(Date.parse('2026-11-04T09:00:00Z'));
  assert.equal(week.key,'2026-11-02');
  assert.equal(contributionTarget(week.start,week.start,week.end,0),4900);
  assert.equal(contributionTarget(Date.parse('2026-11-04T09:00:00Z'),week.start,week.end,600),3080);
  assert.equal(contributionTarget(week.end-1,week.start,week.end,999),1);
  assert.equal(contributionTarget(week.end-1,week.start,week.end,1000),0);
});

test('binomial target uses personal species kill rate and targets use eligible repeatable spawns',()=>{
  assert.equal(collectionGoal(8400),817);
  assert.equal(collectionGoal(1),0);
  assert.equal(collectionGoal(100),7);
  const stats={attack:700,physical:700,elemental:550,speed:1.6,huntSpeed:126};
  for(const level of [1,5,13,23,40,45,53,58,63,68,75,77,200]){
    const areas=eligibleProfessionAreas(level);
    const target=selectProfessionalTarget('test-recipient','2026-11-02',level,stats);
    assert(target);
    assert(areas.includes(target.area));
    assert(target.entry<=level);
    assert(target.count>=2&&target.rate>=1);
    const nearest=Math.min(...professionalTargets.filter(t=>areas.includes(t.area)).map(t=>Math.abs(t.level-level)));
    assert(Math.abs(target.level-level)<=Math.max(3,nearest));
    assert.equal(selectProfessionalTarget('test-recipient','2026-11-02',level,stats)?.monster,target.monster);
  }
  assert.equal(selectProfessionalTarget('test-recipient','2026-11-02',200,stats)?.area,'skypiea-01');
});

test('prison progression, fallback and installation caps preserve earned profession level',()=>{
  assert.equal(professionalFloor({cleared:0,enabled:true}).floor,1);
  assert.equal(professionalFloor({cleared:12,enabled:true}).floor,13);
  assert.equal(professionalFloor({cleared:100,enabled:true,repeats:false}).kind,'patrol');
  assert.deepEqual(professionalFloor({cleared:100,enabled:true,repeats:true}),{kind:'floor',floor:100,revisit:true,reason:null});
  assert.equal(professionalFloor({cleared:12,enabled:true,reachable:n=>n<13}).kind,'patrol');
  assert.equal(professionalFloor({cleared:0,enabled:false}).kind,'patrol');
  assert.deepEqual(professionIds.map(id=>effectiveProfession(id,10,5)),[.10,.10,.02,.05,.05]);
  assert.equal(effectiveProfession('doctor',10,1),.02);
  assert.equal(effectiveProfession('doctor',3,5),.03);
});

test('automatic potions use the Doctor bonus and deployment keeps the ongoing battle intact',()=>{
  const require=createRequire(import.meta.url),engine=require('../../world-battle.cjs'),chars=require('../../character-system.js');
  const stats=chars.derive({classId:'brawler',level:1,attributes:chars.empty()},engine.catalog.classes.brawler,engine.catalog.factions.pirate,{attack:0,defense:0,hp:0});
  const nav=require('../../world-catalog.cjs').load().navigation('dawn'),hero={...nav.map.spawn,direction:'front'};
  const battle=engine.create('beach',stats,1000,()=>.5);
  battle.auto=true;
  battle.autoSkills=false;
  battle.hp=stats.maxHP*.2;
  battle.rulesHash='063ad6d7e40b3146f8542e122e64cff8078b7eb61c49b0722d7e32044be2b461';
  const before=structuredClone(battle);
  engine.upgradeBalance(battle);
  assert.deepEqual(battle,{...before,rulesHash:engine.rulesHash});
  const without=structuredClone(battle);
  const step=(b:typeof battle,potionHealingBonus:number)=>engine.step(b,{hero:{...hero},nav,stats,classId:'brawler',factionId:'pirate',level:1,now:1250,dt:.25,rng:()=>.5,potions:1,potionHealingBonus});
  assert.equal(step(without,0).potionsUsed,1);
  assert.equal(step(battle,.10).potionsUsed,1);
  assert(Math.abs(battle.hp-without.hp-require('../../item-catalog.js').potionRecovery(stats.maxHP)*.10)<1e-6);
});
