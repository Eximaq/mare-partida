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
 assert.equal(originalItemSchema.safeParse({...item,def:189}).success,false);
});
