'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),source=read('player-hub.js');
async function main(){
 let draws=0,fetches=0,canceled=0,frame=0;
 const listeners={},storage=new Map([['mare-partida-player-ui-v1',JSON.stringify({quality:'invalid',density:'compact',motion:'normal',largerText:true})]]);
 const document={baseURI:'https://example.test/game/',documentElement:{dataset:{}},addEventListener:(k,v)=>listeners[k]=v,querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
 const audio={muted:true,volume:.5},context={document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},URL,Date,console,
 fetch:()=>{fetches++;return Promise.resolve({ok:true,json:async()=>[{type:'update',title:'Actual & <news>',date:'01/11/2026',summary:'Existing feed'}]});},
 requestAnimationFrame:()=>++frame,cancelAnimationFrame:()=>canceled++,MareAudio:{getState:()=>audio,setMuted:v=>audio.muted=v,setVolume:v=>audio.volume=v},
 MareHierarchy:{title:(f,t)=>f==='marine'&&t===2?'Marinheiro':'Título real'}};
 vm.runInNewContext(source,context);const api=context.MarePlayerHub;
 api.configure({redraw:()=>draws++,drawPortrait:()=>false,setReducedFX:()=>{}});
 assert.equal(api.getPreferences().quality,'high','invalid saved enums use valid defaults');
 assert.equal(api.getPreferences().density,'compact');
 const game={name:'Teste <&>',classId:'sword',factionId:'marine',hierarchyTier:2,level:42,created:1792500000000,totalPlay:42540,gold:999,stats:{goldEarned:98189},preferences:{hideItems:false},equipment:{weapon:{id:'one',def:0}}};
 const equipment=[{key:'weapon',slot:'Arma principal',item:true,name:'Espada secreta',icon:'assets/ui/items-hd/0.png',rarity:'rare',rarityName:'Raro',level:4,plus:2}];
 const snapshot={game,stats:{power:12345},className:'Espadachim',equipment},initial=JSON.stringify(game);
 let html=api.render('myprofile',snapshot);assert(html.includes('Teste &lt;&amp;&gt;'));assert(html.includes('Marinheiro'));assert(html.includes('98.189'));assert(!html.includes('>999<'));assert(html.includes('Não registrado'));
 assert.equal(JSON.stringify(game),initial,'rendering cannot mutate the game');
 const click=(selector,data)=>listeners.click({target:{closest:s=>s===selector?{dataset:data}:null}});
 click('[data-profile-tab]',{profileTab:'gear'});html=api.render('myprofile',snapshot);assert(html.includes('Espada secreta'));assert(html.includes('data-profile-slot="weapon"'));assert(html.includes('items-hd/0.png'));
 game.preferences.hideItems=true;html=api.render('myprofile',snapshot);assert(html.includes('Equipamentos ocultos'));assert(!html.includes('Espada secreta'));assert(!html.includes('items-hd/0.png'));assert(!html.includes('data-profile-slot='));
 game.preferences.hideItems=false;api.render('myprofile',snapshot);
 document.querySelector=s=>s==='#dialogBody .captain-profile'?{}:null;
 const before=draws;game.equipment.weapon=null;api.refresh(game,{power:100});assert.equal(draws,before+1,'live equipment changes rebuild presentation');
 document.querySelector=()=>null;
 const target={isConnected:true},state={hidden:false,textContent:''};document.getElementById=id=>id==='captainProfilePortrait'?target:id==='captainPortraitState'?state:null;
 let privatePortrait=false;api.configure({drawPortrait:(_,hidden)=>{privatePortrait=hidden;return false;}});
 game.preferences.hideItems=true;api.render('myprofile',snapshot);api.hydrate('myprofile');assert(privatePortrait,'portrait must receive privacy flag');api.unmount();assert(canceled>0,'close cancels pending portrait rendering');
 document.getElementById=()=>null;
 for(const section of ['general','audio','graphics','interface','accessibility']){click('[data-settings-card]',{settingsCard:section});html=api.render('settings',snapshot);assert(html.includes('id="captain-detail-'+section+'"'));assert(html.includes('aria-expanded="true"'));}
 click('[data-settings-tab]',{settingsTab:'discord'});html=api.render('settings',snapshot);assert(html.includes('ainda não informado'));assert(!html.includes('href='),'no invented Discord link');
 api.render('journal',snapshot);await new Promise(resolve=>setImmediate(resolve));html=api.render('journal',snapshot);assert(html.includes('Actual &amp; &lt;news&gt;'));assert.equal(fetches,1,'one lazy feed request, no polling');
 click('[data-journal-tab]',{journalTab:'notice'});html=api.render('journal',snapshot);assert(html.includes('Nenhuma publicação'));assert.equal(fetches,1);
 for(const f of ['morgan-approved.png','icons.png','general-scene.png','audio-scene.png','graphics-scene.png','interface-scene.png','accessibility-scene.png']){const b=fs.readFileSync(path.join(__dirname,'../assets/ui/captain-hd',f));assert.equal(b.subarray(1,4).toString(),'PNG');}
 const gameCode=read('game.js');assert(gameCode.includes('lobby96.preview(c,player'));assert(gameCode.includes('appearance:MareCharacterAppearance.read(player)'),'profile passes persisted cosmetics to shared compositor');assert(gameCode.includes("currentPanel==='myprofile'&&element.dataset.profileSlot"));assert(!source.includes("getElementById('portrait')"),'never upscale the legacy portrait');
 assert(read('tools/build_pages.py').includes("'captain-hd.css'"));assert(read('index.html').includes('captain-hd.css'));
 console.log('Captain HD: canonical data, hidden-item privacy, isolated preferences, shared portrait lifecycle, lazy feed and assets passed');
}
main().catch(e=>{console.error(e);process.exit(1)});
