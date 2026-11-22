'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),f=R+'/player-rework-native-hd.js',m=new Module(f);
 m.filename=f;m.paths=Module._nodeModulePaths(R);require.cache[f]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),f);m.loaded=true;
}
const {make}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),W=require(R+'/paper-doll-96-lobby.js');
const catalog=require(R+'/tools/paper-doll-96-v3/weapons.json');
const n=make();
(async()=>{await n.ready;let count=0;
 for(const [classId,def] of [['brawler',2],['sword',0],['gunner',114],['cyborg',117],['strategist',17],['rogue',73],['healer',31]])
 for(const skinColor of ['light','ebony'])for(const direction of ['north','south','east','west'])for(const gloves of [26,180]){
  const appearance96=A.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor});
  const gear={coat:{def:151},gloves:{def:gloves}},plain={classId,appearance96,equipment:gear};
  const p={...plain,equipment:{...gear,weapon:{def}}},snapshot=JSON.stringify(p),o={consumer:'world',direction,action:'attack-unarmed'};
  const normalBefore=W.selectWorldHD(n,catalog,p,o),off=W.selectWorldHD(n,catalog,plain,o);
  a(off?.signedWeaponGarments?.assetPool==='outfit');
  const hidden=W.selectWorldHD(n,catalog,p,{...o,weaponless:true});
  a(hidden?.signedWeaponGarments?.assetPool==='outfit','armed save cannot route temporary weaponless punch');
  a.deepEqual(hidden,off);
  a.equal(hidden.slotRoutes.weapon,undefined);a.deepEqual(Object.keys(hidden.slotRoutes).sort(),['coat','gloves']);
  a.deepEqual(W.selectWorldHD(n,catalog,p,o),normalBefore);
  a.equal(JSON.stringify(p),snapshot);
  count++;
 }
 console.log('PASS',count,'masked weapon routes equal identical unarmed pose; no save mutation or change in normal provider');
})().catch(e=>{console.error(e);process.exitCode=1});
