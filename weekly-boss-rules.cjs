'use strict';
// Server-only rules. No defaults activate an event or award an item.
const A=require('./akainu-combat.js');
const policy=Object.freeze({version:1,presenceMs:10000,reconnectMs:60000,minCombatMs:10000,minDamageFraction:.001,minHealingFraction:.5,maxPlayers:16,maxContributors:256,maxDurationMinutes:180});
const DAY=86400000,WEEK=7*DAY,FORTALEZA_OFFSET=3*3600000;
function timestamp(value){const n=value instanceof Date?value.getTime():value;if(!Number.isFinite(n))throw new TypeError('weekly_boss_clock_invalid');return n;}
function cycleStart(at){const n=timestamp(at)-FORTALEZA_OFFSET,d=new Date(n);d.setUTCHours(0,0,0,0);return d.getTime()-((d.getUTCDay()+6)%7)*DAY+FORTALEZA_OFFSET;}
function cycleKey(at){return new Date(cycleStart(at)-FORTALEZA_OFFSET).toISOString().slice(0,10);}
function cycleEnd(at){return cycleStart(at)+WEEK;}
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const point=p=>p&&typeof p==='object'&&Object.keys(p).length===2&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function canActivate(config,{map}={}){
 if(!config||config.mapId!=='marineford')throw Error('weekly_boss_map_unavailable');
 let nav;try{nav=typeof map==='function'?map('marineford'):null;}catch{throw Error('weekly_boss_map_unavailable');}
 if(!nav?.map)throw Error('weekly_boss_map_unavailable');
 if(config.balanceApproved!==true)throw Error('weekly_boss_balance_required');
 return validateArena(config,nav);
}
function validateArena(config,nav){
 if(!integer(config.maxPlayers,1,policy.maxPlayers)||!integer(config.minLevel,1,1000)||!integer(config.durationMinutes,1,policy.maxDurationMinutes)||!point(config.spawn)||!point(config.entry))throw Error('weekly_boss_config_invalid');
 try{A.validateProfile(config.profile);}catch{throw Error('weekly_boss_config_invalid');}
 const {spawn,entry,profile}=config,r=profile.aoeRadius+16,width=nav.map.width,height=nav.map.height;
 const inside=p=>p.x>=16&&p.y>=16&&p.x<=width-16&&p.y<=height-16&&nav.walkable(p.x,p.y);
 if(!Number.isFinite(width)||!Number.isFinite(height)||!inside(spawn)||!inside(entry)||spawn.x<r||spawn.y<r||spawn.x>width-r||spawn.y>height-r)throw Error('weekly_boss_spawn_blocked');
 const distance=Math.hypot(entry.x-spawn.x,entry.y-spawn.y);
 if(distance<r||distance>profile.leash||!nav.projectileClear(spawn,entry)||!nav.path(entry,spawn)?.length)throw Error('weekly_boss_spawn_blocked');
 for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={x:spawn.x+Math.cos(angle)*r,y:spawn.y+Math.sin(angle)*r};if(!inside(p)||!nav.projectileClear(spawn,p))throw Error('weekly_boss_spawn_blocked');}
 return true;
}
function eligible(c,bossMaxHP,healerMaxHP,at){
 const now=timestamp(at);
 if(!c||c.connected!==true||![c.damage,c.healing,c.combatMs,c.lastSeen,c.hp,bossMaxHP,healerMaxHP].every(Number.isFinite))return false;
 if(c.hp<=0||bossMaxHP<=0||healerMaxHP<=0||c.damage<0||c.healing<0||c.combatMs<policy.minCombatMs||c.lastSeen>now||now-c.lastSeen>policy.presenceMs)return false;
 return c.damage>=bossMaxHP*policy.minDamageFraction||c.healing>=healerMaxHP*policy.minHealingFraction;
}
module.exports={policy,cycleKey,cycleEnd,canActivate,validateArena,eligible};
