'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function fixture({layered=true,exact=false,canonical=false}={}){
  const drawn=[];
  const context=vm.createContext({
    URL,AbortController,performance,setTimeout,clearTimeout,console:{error(){}},
    fetch:async()=>({ok:false}),
    MareHeadgear:{hidden:()=>false},
    MareReworkNativeHD:{create:()=>({
      ready:Promise.resolve(),snapshot:()=>({}),
      select:(_p,o)=>o.action!=='attack-unarmed'||o.direction!=='south'||exact?{id:'strict-hd'}:null,
      selectVisual:function(p,o){if(canonical&&o.action==='walk'&&o.direction==='north')return {id:'canonical-hd'};return this.select(p,o)||this.selectLayered(p,o);},
      selectLayered:(p,o)=>layered&&o.action==='attack-unarmed'&&o.direction==='south'?{
        id:'registered-layered-pilot',
        omitted:p.equipment.coat?['coat']:[]
      }:null,
      prepareConfiguration:async function(poses,{resolve=({player,options})=>({source:this.select(player,options)})}){
        const routeKey=o=>JSON.stringify([o.action,o.direction,!!o.weaponless]);
        const routes=new Map(poses.map(p=>[routeKey(p.options),resolve(p)]));
        return {coverage:poses.map(p=>{
          const r=routes.get(routeKey(p.options));
          return {...p.options,weaponless:!!p.options.weaponless,source:r.source.id,omitted:r.source.omitted||[]};
        }),draw(_ctx,p,o){const route=routes.get(routeKey(o));if(!route)return false;
          drawn.push({source:route.source.id,skin:p.appearance96.skin,hairColor:p.appearance96.hairColor});
          return true;
        },release(){}};
      }
    })}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../paper-doll-96-lobby.js'),'utf8'),context);
  const lobby=context.MarePaperDoll96Lobby.create({baseURL:'https://example.test/index.html'});
  const player={appearance96:{gender:'masculino',skin:'dark',hairColor:'pink'},equipment:{legs:{def:133},coat:{def:6}}};
  return {lobby,player,drawn};
}

async function prepare(lobby,player,{action='attack-unarmed',direction='south',weaponless=false}={}){
  lobby.requestWorldVisual(player,{action,direction,weaponless,consumer:'world'});
  for(let i=0;i<20&&lobby.worldVisual().state==='loading';i++)await new Promise(setImmediate);
  return lobby.worldVisual();
}

test('the real map consumer builds and draws both registered HD punch routes instead of selecting modular96',async()=>{
  const {lobby,player,drawn}=fixture();
  const covered=[];
  for(const weaponless of [false,true]){
   const state=await prepare(lobby,player,{weaponless});
   assert.equal(state.state,'ready',state.error);assert.equal(lobby.worldReady(player),true);
   covered.push(...state.coverage);
   assert.ok(lobby.drawWorldVisual({}, {action:'attack-unarmed',direction:'south',weaponless},player));
  }
  assert.deepEqual(JSON.parse(JSON.stringify(covered.map(c=>[c.weaponless,c.source,c.omitted]))),[
    [false,'registered-layered-pilot',['coat']],
    [true,'registered-layered-pilot',['coat']]
  ]);
  assert.deepEqual(drawn,[0,1].map(()=>({source:'registered-layered-pilot',skin:'dark',hairColor:'pink'})));
});

test('an exact HD route wins and omission metadata is not carried over from a candidate',async()=>{
  const {lobby,player}=fixture({exact:true});
  const state=await prepare(lobby,player);
  assert.equal(state.state,'ready',state.error);
  assert.ok(state.coverage.every(c=>c.source==='strict-hd'&&!c.omitted.length));
});

test('an unregistered pose still follows the existing route rather than inventing an HD match',async()=>{
  const {lobby,player}=fixture({layered:false});
  const state=await prepare(lobby,player);
  assert.equal(state.state,'failed');
  assert.equal(state.coverage.length,0);
  assert.match(state.error,/sprite|indispon|visual/i);
  assert.equal(lobby.worldReady(player),false);
  assert.equal(lobby.drawWorldVisual({}, {action:'attack-unarmed',direction:'south'},player),false);
});

test('canonical per-slot precedence is honored by the map consumer',async()=>{
  const {lobby,player}=fixture({exact:true,canonical:true});
  const state=await prepare(lobby,player,{action:'walk',direction:'north'});
  assert.equal(state.state,'ready',state.error);
  const route=state.coverage.find(x=>x.action==='walk'&&x.direction==='north');
  assert.equal(route?.source,'canonical-hd');
});
