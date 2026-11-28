import {test} from 'node:test';
import assert from 'node:assert/strict';
import {originalSlotSchema,originalItemSchema,originalInventorySchema} from '../../packages/shared/src/schemas/original-inventory.js';
test('Visual Completo can use existing owned-item commands and old inventories remain readable',()=>{
 assert.equal(originalSlotSchema.safeParse('visual_completo').success,true);
 const item={id:'zoro-test',def:187,level:1,plus:0,locked:false,obtainedAt:0};
 assert.equal(originalItemSchema.safeParse(item).success,true);
 const equipment=Object.fromEntries(['head','necklace','coat','legs','boots','weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'].map(s=>[s,null]));
 const old={catalogId:'original-game-v1',inventory:[],equipment,potions:0,materials:0,forgeVersion:5,forgeSeq:0,forgeHistory:[]};
 const parsed=originalInventorySchema.parse(old);
 assert.equal(parsed.equipment.visual_completo,null);
 const next=originalInventorySchema.parse({...old,equipment:{...equipment,visual_completo:item}});
 assert.equal(next.equipment.visual_completo?.id,'zoro-test');
 assert.equal(originalItemSchema.safeParse({...item,def:249}).success,false);
});

test('Luffy index 246 persists in the original inventory and equipment schema',()=>{
 const item={id:'luffy-test',def:246,level:1,plus:0,locked:false,obtainedAt:0,binding:'character',boundToCharacter:'00000000-0000-4000-8000-000000000001'};
 assert.equal(originalItemSchema.safeParse(item).success,true);
 const equipment=Object.fromEntries(originalSlotSchema.options.map(slot=>[slot,null]));
 const backpack={catalogId:'original-game-v1',inventory:[item],equipment,potions:0,materials:0,forgeVersion:5,forgeSeq:0,forgeHistory:[]};
 assert.deepEqual(originalInventorySchema.parse(JSON.parse(JSON.stringify(backpack))).inventory,[item]);
 const equipped={...backpack,inventory:[],equipment:{...equipment,visual_completo:item}};
 assert.deepEqual(originalInventorySchema.parse(JSON.parse(JSON.stringify(equipped))).equipment.visual_completo,item);
 for(const def of [-1,246.5,249])assert.equal(originalItemSchema.safeParse({...item,def}).success,false,String(def));
 assert.equal(originalItemSchema.safeParse({...item,def:245}).success,true,'last preexisting item remains accepted');
});
