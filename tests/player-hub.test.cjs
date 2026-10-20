'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const index=read('index.html'),game=read('game.js'),audio=read('audio-system.js'),hub=read('player-hub.js'),css=read('player-hub.css'),builder=read('tools/build_pages.py');
for(const file of ['game.js','audio-system.js','player-hub.js','ui-system.js'])new vm.Script(read(file),{filename:file});
for(const id of ['journal','myprofile','settings'])assert.ok(index.includes('data-captain-section="'+id+'"'),id);
assert.ok(index.includes('id="captainMenuTrigger"')&&index.includes('aria-haspopup="menu"'));
assert.ok(index.includes('icones_menu_pirata/png/48/configuracoes.png'));
assert.ok(fs.existsSync(path.join(__dirname,'..','icones_menu_pirata/png/48/configuracoes.png')));
const png=fs.readFileSync(path.join(__dirname,'..','icones_menu_pirata/png/48/configuracoes.png'));
assert.equal(png.subarray(1,4).toString(),'PNG');
assert.equal(png.readUInt32BE(16),48);assert.equal(png.readUInt32BE(20),48);
assert.match(game,/function toggleCaptainMenu\(\)/);
assert.match(game,/closeCaptainMenu\(true\)/);
assert.match(game,/openPanel\(captainSection\.dataset\.captainSection\)/);
assert.match(game,/\['journal','myprofile','settings'\]/);
assert.match(game,/MarePlayerHub\.hydrate\(currentPanel\)/);
assert.match(audio,/setMuted,setVolume/);
assert.doesNotMatch(audio,/mareMusicDock|mare-music-dock/,'floating audio controller was removed');
for(const file of ['player-hub.css','player-hub.js','journal-feed.json'])assert.ok(builder.includes("'"+file+"'"),'published '+file);
for(const file of ['player-hub.css','player-hub.js'])assert.ok(index.includes(file),'loaded '+file);
const journal=JSON.parse(read('journal-feed.json'));assert.ok(Array.isArray(journal));
assert.ok(journal.every(item=>['event','update','notice'].includes(item.type)));
const listeners={};
const context={
  document:{baseURI:'https://example.test/mare-partida/',documentElement:{dataset:{}},addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>null,getElementById:()=>null},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  fetch:()=>Promise.resolve({ok:true,json:async()=>journal}),
  URL,console
};
vm.runInNewContext(hub,context,{filename:'player-hub.js'});
const api=context.MarePlayerHub;assert.ok(api);
api.configure({redraw:()=>{},setReducedFX:()=>{}});
const profile=api.render('myprofile',{game:{name:'Capitão Teste',classId:'sword',level:36,created:1792500000000,totalPlay:181000,stats:{kills:21,damage:1500,goldEarned:900}},className:'Espadachim',factionName:'Pirata',stats:{power:2917},equipment:[]});
assert.ok(profile.includes('Capitão Teste')&&profile.includes('2.917')&&profile.includes('36'));
assert.ok(profile.includes('Indisponível')&&!profile.includes('#2.578'),'no invented online rankings');
const settings=api.render('settings',{game:{}});assert.ok(settings.includes('data-settings-card="audio"'));
assert.ok(css.includes('@media(max-width:760px)'));
console.log('Central do Navegante: navegação, PNG, save local, perfil verdadeiro, configurações e publicação OK');
