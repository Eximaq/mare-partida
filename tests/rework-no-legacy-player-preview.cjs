'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),
 lobbySource=fs.readFileSync(process.env.LOBBY_TRIAL||path.join(R,'paper-doll-96-lobby.js'),'utf8'),
 gameSource=fs.readFileSync(process.env.GAME_TRIAL||path.join(R,'game.js'),'utf8');
const player={classId:'healer',appearance96:{gender:'masculino',skinColor:'ebony'},equipment:{weapon:{def:32},legs:{def:22}}};
const gameBefore=JSON.stringify(player);
let nativeAvailable=false,skinAvailable=false,signedAvailable=false,reviewActive=false;
const calls={native:[],draft:[],stable:0,prepared:0,unsigned:0,subset:0,skin:0,signed:0};
const defaultHD={draw(){calls.subset++;return true;},prepare(){calls.subset++;return true;},prepareStablePose(){calls.subset++;return true;},clear(){},snapshot(){return {};}};
const env={JSON,URL,AbortController,performance,module:{exports:{}},require(f){return require(path.join(R,f));},fetch:async()=>({ok:false,status:404}),
 MareReworkNativeHD:{create:()=>({drawStable(_,p,o){calls.native.push([p,o]);return nativeAvailable;},
   draw(_,p,o){calls.draft.push([p,o]);return nativeAvailable;},snapshot(){return {};},prepareClip(){calls.prepared++;return nativeAvailable;},
   async prepareStablePose(){calls.stable++;return nativeAvailable;}})},
 MareReworkDefaultHD:{create:()=>defaultHD},MareReworkWeapons:{create:()=>reviewActive?{active:true,snapshot(){return {};},draw(){calls.unsigned++;return true;}}:null},
 MarePlayerReworkRuntime:{create:()=>({get active(){return signedAvailable;},snapshot(){return {};},draw(){calls.signed++;return signedAvailable;}})},
 MareVisualCompletoRenderer:{draw(){calls.skin++;return skinAvailable;}},console};
vm.runInNewContext(lobbySource,env);
const C={canvas:{width:400,height:300}}, create=(sharedLobby=false)=>env.module.exports.create({baseURL:'https://test.invalid/',sharedLobby});
(async()=>{
 const lobby=create(),o={scene:'lobby',action:'idle',direction:'south',consumer:'inventorySprite'};
 assert.equal(lobby.draw(C,player,o),false);assert.equal(calls.subset,0);
 assert.equal(lobby.preview(C,player,{consumer:'appearance-preview'}),false);
 assert.equal(lobby.preview(C,player,{consumer:'profile-portrait',appearance:player.appearance96}),false);
 assert.equal(await lobby.ensure(player),false);assert.equal(calls.subset,0);assert.equal(calls.prepared,0);
 reviewActive=true;const peers=create(true);
 assert.equal(peers.draw(C,player,{...o,consumer:'shared-lobby'}),false);
 assert.equal(calls.native.at(-1)[0],player);assert.equal(calls.native.at(-1)[1].consumer,'world');
 assert.equal(calls.unsigned,0);assert.equal(peers.preview(C,player),false);assert.equal(calls.unsigned,0);
 nativeAvailable=true;
 assert(lobby.draw(C,player,o));assert(peers.draw(C,player,{...o,consumer:'shared-lobby'}));
 const draft={...player.appearance96,skinColor:'light'};
 assert(lobby.preview(C,player,{appearance:draft,consumer:'character-creation'}));
 assert.equal(calls.draft.at(-1)[0].appearance96,draft);assert.equal(calls.draft.at(-1)[1].previewFit,'creation');
 assert.equal(Object.keys(calls.draft.at(-1)[0].equipment).length,0);
 skinAvailable=true;
 assert(lobby.preview(C,{...player,zoanTransformed:true},{appearance:draft,consumer:'appearance-editor'}));
 assert.equal(Object.keys(calls.draft.at(-1)[0].equipment).length,0);
 assert.equal(calls.draft.at(-1)[0].zoanTransformed,false);
 nativeAvailable=false;skinAvailable=true;
 assert(peers.draw(C,player,o));assert(lobby.preview(C,player));
 skinAvailable=false;signedAvailable=true;
 assert(peers.draw(C,player,o));assert(lobby.preview(C,player));
 assert.equal(lobby.preview(C,player,{appearance:draft,consumer:'character-creation'}),false);
 assert.equal(calls.signed,2);assert.equal(JSON.stringify(player),gameBefore);

 // Both equipment panels use the exact shared portrait route. A pending
 // raster leaves the preview clear, without starting another renderer.
 const code=gameSource.slice(gameSource.indexOf('  function drawCharacterStatusPreview('),gameSource.indexOf('  function invSymbol('));
 let cleared=0,ready=false,full=false;
 const model=structuredClone(player),callsPortrait=[];
 const c={clientWidth:100,clientHeight:100,dataset:{},getContext:()=>({clearRect(){cleared++;}})};
 const sheet={width:200,height:200,dataset:{},getContext:c.getContext};
 const sandbox={game:model,world:{time:0,hero:{direction:'west'}},$:()=>sheet,
  MareVisualCompletoRenderer:{equipped:()=>full},lobby96:{drawWorldPortrait(_,actor,options){
   assert.deepEqual(actor.appearance96,player.appearance96);
   assert.deepEqual(actor.equipment,player.equipment);
   assert.notEqual(actor.zoanTransformed,true);
   assert.equal(options.zoom,2);callsPortrait.push(options.consumer);
   return ready;
  }}};
 vm.runInNewContext(code,sandbox);
 sandbox.drawInventoryAvatar(c,{force:true});
 assert.equal(c.dataset.avatarRenderer,'pending-hd');assert.equal(cleared,1);
 sandbox.drawCharacterStatusPreview();assert.equal(sheet.dataset.avatarRenderer,'pending-hd');
 for(const [visual,renderer] of [[false,'native-hd'],[true,'visual-completo']]){
  full=visual;ready=true;model.zoanTransformed=true;
  sandbox.drawInventoryAvatar(c,{force:true});sandbox.drawCharacterStatusPreview();
  assert.equal(c.dataset.avatarRenderer,renderer);assert.equal(sheet.dataset.avatarRenderer,renderer);
 }
 assert.deepEqual(callsPortrait,['inventory','character-status','inventory','character-status','inventory','character-status']);
 assert.equal(model.zoanTransformed,true);
 assert.deepEqual(model.appearance96,player.appearance96);assert.deepEqual(model.equipment,player.equipment);
 console.log('PASS inventory, status/editor/creation dispatch, signed skins/release and shared lobby reject legacy fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
