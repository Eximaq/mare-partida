'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),
 lobbySource=fs.readFileSync(process.env.LOBBY_TRIAL||path.join(R,'paper-doll-96-lobby.js'),'utf8'),
 gameSource=fs.readFileSync(process.env.GAME_TRIAL||path.join(R,'game.js'),'utf8');
const player={classId:'healer',appearance96:{gender:'masculino',skinColor:'ebony'},equipment:{weapon:{def:32},legs:{def:22}}};
const gameBefore=JSON.stringify(player);
let nativeAvailable=false,skinAvailable=false,signedAvailable=false,reviewActive=false;
const calls={native:[],draft:[],stable:0,prepared:0,unsigned:0,subset:0,skin:0,signed:0};
const defaultHD={draw(){calls.subset++;return true;},prepare(){calls.subset++;return true;},prepareStablePose(){calls.subset++;return true;},clear(){}};
const env={JSON,URL,module:{exports:{}},require(f){return require(path.join(R,f));},fetch:()=>new Promise(()=>{}),
 MareReworkNativeHD:{create:()=>({drawStable(_,p,o){calls.native.push([p,o]);return nativeAvailable;},
   draw(_,p,o){calls.draft.push([p,o]);return nativeAvailable;},prepareClip(){calls.prepared++;return nativeAvailable;},
   async prepareStablePose(){calls.stable++;return nativeAvailable;}})},
 MareReworkDefaultHD:{create:()=>defaultHD},MareReworkWeapons:{create:()=>reviewActive?{active:true,draw(){calls.unsigned++;return true;}}:null},
 MarePlayerReworkRuntime:{create:()=>({get active(){return signedAvailable;},draw(){calls.signed++;return signedAvailable;}})},
 MareVisualCompletoRenderer:{draw(){calls.skin++;return skinAvailable;}},console};
vm.runInNewContext(lobbySource,env);
const C={canvas:{width:400,height:300}}, create=(sharedLobby=false)=>env.module.exports.create({baseURL:'https://test.invalid/',sharedLobby});
(async()=>{
 const lobby=create(),o={scene:'lobby',action:'idle',direction:'south',consumer:'inventorySprite'};
 assert.equal(lobby.draw(C,player,o),false);assert.equal(calls.subset,0);
 assert.equal(lobby.preview(C,player,{consumer:'appearance-preview'}),false);
 assert.equal(lobby.preview(C,player,{consumer:'profile-portrait',appearance:player.appearance96}),false);
 await lobby.ensure(player);assert.equal(calls.subset,0);assert.equal(calls.prepared,1);
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

 // Run the real inventory function against a fitted-miss canvas: only the
 // explicit special visual may reach drawCurrentPreview; it never mutates save.
 const code=gameSource.slice(gameSource.indexOf('  let inventoryAvatarLast='),gameSource.indexOf('  function invSymbol('));
 let cleared=0,preview=0,fitted=false,full=false;
 const model=structuredClone(player);
 const c={clientWidth:100,clientHeight:100,dataset:{},getContext:()=>({clearRect(){cleared++;}})};
 const sandbox={game:model,world:{time:0,hero:{visible:true}},
  MareVisualCompletoRenderer:{equipped:()=>full},lobby96:{drawFittedAvatar:()=>fitted},
  document:{createElement:()=>({})},drawCurrentPreview(){preview++;},MareReworkNativeHD:{fitInventoryAvatar:()=>true}};
 vm.runInNewContext(code,sandbox);
 sandbox.drawInventoryAvatar(c,{force:true});assert.equal(preview,0);assert.equal(c.dataset.avatarRenderer,'pending-hd');assert.equal(cleared,1);
 fitted=true;sandbox.drawInventoryAvatar(c,{force:true});assert.equal(c.dataset.avatarRenderer,'native-hd');
 full=true;sandbox.drawInventoryAvatar(c,{force:true});assert.equal(c.dataset.avatarRenderer,'special-visual');assert.equal(preview,1);
 full=false;model.zoanTransformed=true;sandbox.drawInventoryAvatar(c,{force:true});assert.equal(preview,2);
 assert.deepEqual(model.appearance96,player.appearance96);assert.deepEqual(model.equipment,player.equipment);
 const status=gameSource.slice(gameSource.indexOf('  function drawCharacterStatusPreview('),gameSource.indexOf('  function drawCurrentPreview('));
 const statusCtx={clearRect(){cleared++;},save(){},restore(){},scale(){}};
 const sheet={width:200,height:200,dataset:{},getContext:()=>statusCtx};
 Object.assign(sandbox,{$:()=>sheet,scene:'lobby'});let approved=false;
 sandbox.lobby96.drawWorldPortrait=(_,avatar,options)=>{
  assert.equal(options.consumer,'character-status');assert.equal(avatar,model);
  return approved;
 };
 fitted=false;model.zoanTransformed=false;vm.runInNewContext(status,sandbox);
 sandbox.drawCharacterStatusPreview();assert.equal(sheet.dataset.avatarRenderer,'pending-hd');
 approved=true;full=true;sandbox.drawCharacterStatusPreview();assert.equal(sheet.dataset.avatarRenderer,'visual-completo');
 full=false;fitted=true;sandbox.drawCharacterStatusPreview();assert.equal(sheet.dataset.avatarRenderer,'native-hd');
 console.log('PASS inventory, status/editor/creation dispatch, signed skins/release and shared lobby reject legacy fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
