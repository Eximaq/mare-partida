'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),C=require('../rank-c-system.js');
const root=path.join(__dirname,'..'),manifest=require('../assets/akuma/rank-c-manifest.json');assert.equal(manifest.length,14);
for(const f of manifest)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.asset))).digest('hex'),f.sha256,f.asset);
for(const [key,count] of Object.entries({heal:25,mutation:17,axe:17,mark:5})){const fx=C.effects[key];assert.equal(fx.frames.length,count);assert.equal(fx.duration,fx.frames.reduce((n,f)=>n+f.duration,0));for(const f of fx.frames){assert.equal(f.w,64);assert.equal(f.h,64);assert(f.duration>0);}}
assert.deepEqual(C.rules.horu.passiveStats,{max_hp:160,physical_attack:12,special_attack:14,healing_received_percent:.08});assert.deepEqual(C.rules.mato.passiveStats,{physical_attack:16,attack_speed:.06,armor_penetration:.06,movement_speed:.05});
console.log('Rank C: 14 original assets, four frame sequences and exact passives passed');

const game=fs.readFileSync(path.join(root,'game.js'),'utf8'),hero=game.slice(game.indexOf('function drawTalentedHero'),game.indexOf('function drawForegroundLayer'));assert(hero.indexOf("drawHoruHealFx(false)")<hero.indexOf('ctx.save();if(rt.hidden)'),'Horu healing effect is behind the character');assert(hero.indexOf("MareRankC.draw(ctx,'mutation'")<hero.indexOf('ctx.save();if(rt.hidden)'),'Horu mutation aura is behind the character');

assert(hero.indexOf('drawHoruHealFx(true)')>hero.indexOf('ctx.save();if(rt.hidden)'),'Lower healing ring wraps in front of the body');assert(game.includes('member.y-52*scale'),'Head remains above the foreground ring');
