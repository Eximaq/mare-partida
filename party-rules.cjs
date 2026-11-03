'use strict';
// Server-side policy: only participants admitted to the same encounter count.
const policy=Object.freeze({capacity:4,maxMonsters:80,xpRadius:768,connectionMs:10000,reconnectMs:60000,inviteMs:60000,preparationMs:60000,bossHp:[1,1.6,2.2,2.8]});
function count(n){if(!Number.isInteger(n)||n<0||n>4)throw new RangeError('Invalid participant count');return n;}
function population(base,n){count(n);if(!Number.isInteger(base)||base<0)throw new RangeError('Invalid population');return Math.min(policy.maxMonsters,Math.ceil(base*(1+n*.2)));}
function shares(xp,ids,offset=0){if(!Number.isSafeInteger(xp)||xp<0||!ids.length||ids.length>4||new Set(ids).size!==ids.length)throw new RangeError('Invalid XP distribution');const sorted=ids.slice().sort(),result=Object.fromEntries(sorted.map(id=>[id,Math.floor(xp/ids.length)]));for(let i=0;i<xp%ids.length;i++)result[sorted[(offset+i)%sorted.length]]++;return result;}
function eligible(members,kill,now){return members.filter(m=>m.connected&&m.hp>0&&m.instanceId===kill.instanceId&&now-m.lastSeen<policy.connectionMs&&Math.hypot(m.x-kill.x,m.y-kill.y)<=policy.xpRadius);}
function canStart(p,ids,nonce){return !!p&&p.nonce===nonce&&ids.length>=2&&ids.length<=4&&ids.slice().sort().join()===p.members.slice().sort().join()&&ids.every(id=>p.ready[id]===true);}
module.exports={policy,population,shares,eligible,canStart};
