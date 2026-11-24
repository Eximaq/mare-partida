'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm');
const source=readFileSync(require.resolve('../game.js'),'utf8');
const finish=source.slice(source.indexOf('  async function finishCreation(){'),source.indexOf("  $('createCharacter').addEventListener"));
test('offline class change swaps owned weapons at capacity without granting or losing equipment',async()=>{
 const old={id:'owned-sword',def:0},replacement={id:'owned-gun',def:4};
 for(const [count,hasReplacement,shouldSave] of [[120,true,true],[120,false,false],[119,false,true]]){
  const bags=Array.from({length:count},(_,i)=>({id:'item-'+i,def:20}));
  if(hasReplacement)bags[count-1]=replacement;
  const original={name:'Nauta',classId:'sword',hp:100,energy:40,equipment:{weapon:old},inventory:bags};
  const fields={},node=id=>fields[id]??={value:original.name,classList:{add(){}}};
  const context={game:original,editingCharacter:true,selectedClass:'gunner',selectedFaction:'pirate',creationAppearanceDraft:{},
   creationLookDraft:{},BAG_CAPACITY:120,ONLINE_GAME:null,DEV_ACTIVE:false,STORAGE_KEY:'test',localStorage:{setItem(){}},
   validateCreationName:()=>true,$:node,MareCharacterAppearance:{read:()=>({}),canSaveAppearance:()=>true,commit:(g,_d,write)=>write(g)&&g},
   itemDefs:{0:{slot:'weapon',type:'sword'},4:{slot:'weapon',type:'gunner'}},MareHierarchy:{migrate:g=>g},getDerived:()=>({maxHP:100,maxEnergy:100}),
   session:{},MareTalentCombat:{create:()=>({})},syncHierarchy(){},configureFactionVisual(){},renderPortrait(){},updateUI(){},saveGame(){},toast(){},
   talentDraft:null,characterTab:null};
  await runInNewContext(finish+'\nfinishCreation();',context);
  assert.equal(context.game.classId,shouldSave?'gunner':'sword');
  assert.equal(context.game.inventory.length,shouldSave&&!hasReplacement?count+1:count);
  assert.equal(context.game.equipment.weapon?.id,shouldSave?(hasReplacement?replacement.id:undefined):old.id);
  assert.equal(context.game.inventory.filter(i=>i.id===old.id).length,shouldSave?1:0);
  assert.equal(bags.length,count);
 }
});
