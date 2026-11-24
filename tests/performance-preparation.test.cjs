'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const lobby=fs.readFileSync(path.join(__dirname,'../paper-doll-96-lobby.js'),'utf8');

function fixture(){
 const prepared=[],released=[],pending=new Map(),drawn=[];
 const root={MareHeadgear:{hidden:p=>!!p.preferences?.hideHeadgear},MareReworkNativeHD:{create:()=>native}};
 const native={ready:Promise.resolve(),snapshot:()=>({}),
  selectVisual(player,o){
   const hidden=!!player.preferences?.hideHeadgear,id=player.equipment.head.def;
   return {id:[id,hidden,o.action,o.direction].join('/'),action:o.action,direction:o.direction,
    body:'male',pack:{directions:{[o.direction]:{clip:{frames:1}}}},
    slotRoutes:hidden?{}:{head:{item:id,quality:'hd',source:'signed-hat-'+id}}};
  },
  async prepareConfiguration([pose],{resolve}){
   const {source}=resolve(pose),id=source.id;prepared.push(id);
   if(pending.has(id))await pending.get(id).promise;
   return {coverage:[source],draw(){drawn.push(id);return true;},release(){released.push(id);}};
  }
 };
 const load=new Function('globalThis','URL','fetch','performance','AbortController','console',lobby+';return globalThis.MarePaperDoll96Lobby');
 const api=load(root,class URL{},async()=>({ok:false}),performance,AbortController,{error(){}}).create({baseURL:'https://fixture.test/'});
 return {api,prepared,drawn,released,hold(key){let finish;const promise=new Promise(r=>{finish=r;});pending.set(key,{promise});return finish;}};
}
const player=id=>({classId:'sword',appearance96:{gender:'masculino',skinColor:'light'},equipment:{head:{def:id}}});
const clip=(action,direction)=>({consumer:'world',action,direction});

test('cada movimento carrega sua pose enquanto o jogador já pode desenhar outra direção',async()=>{
 const {api,prepared,drawn,hold}=fixture();await api.ready;
 const p=player(19),north=clip('walk','north'),south=clip('idle','south');
 const resume=hold('19/false/walk/north'),walking=api.requestWorldVisual(p,north);
 await api.requestWorldVisual(p,south).promise;
 assert.deepEqual(prepared.sort(),['19/false/idle/south','19/false/walk/north']);
 assert.equal(walking.state,'loading');assert(api.drawWorldVisual({},south,p));
 assert(!api.drawWorldVisual({},north,p));assert.deepEqual(drawn,['19/false/idle/south']);
 resume();await walking.promise;assert(api.drawWorldVisual({},north,p));
 assert.equal(drawn.at(-1),'19/false/walk/north');
});

test('trocas A → B → A reutilizam a pose pronta e a preferência do capacete tem chave própria',async()=>{
 const {api,prepared,drawn}=fixture();await api.ready;
 const o=clip('idle','south'),p=player(19),q=player(18);
 for(const who of [p,q,p]){await api.requestWorldVisual(who,o).promise;assert(api.drawWorldVisual({},o,who));}
 assert.equal(prepared.length,2);assert.deepEqual(drawn,['19/false/idle/south','18/false/idle/south','19/false/idle/south']);
 p.preferences={hideHeadgear:true};await api.requestWorldVisual(p,o).promise;assert(api.drawWorldVisual({},o,p));
 assert.equal(drawn.at(-1),'19/true/idle/south');assert.equal(prepared.length,3);
});
