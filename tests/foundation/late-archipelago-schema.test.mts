import {test} from 'node:test';
import assert from 'node:assert/strict';
import {achievementsSnapshotSchema,achievementIdSchema} from '../../packages/shared/src/schemas/achievements.js';

// A player who visits every current destination must still be able to load
// their online state; the former 32-entry limit failed at the 33rd visit.
test('a save with all 37 island visits reloads without losing exploration progress',()=>{
 const islands=[
  'dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown',
  'alabasta-desert','alubarna-01','alubarna-02','alubarna-03','alubarna-04','alubarna-05',
  'skypiea-01','skypiea-02','skypiea-03','skypiea-04',
  'enies-lobby-01','enies-lobby-02','enies-lobby-03','enies-lobby-04','enies-lobby-05',
  'thriller-bark-01','thriller-bark-02','thriller-bark-03','thriller-bark-04',
  'sabaody-01','sabaody-02','sabaody-03','sabaody-04',
  'marineford-01','marineford-02','marineford-03','marineford-04','marineford-05','marineford-06'
 ];
 const saved={rulesetId:'original-achievements-v1',claimed:['islands-0'],bonus:1,kills:0,
  records:{coins:0,peakPower:0,islands},
  entries:achievementIdSchema.options.map(id=>({id,category:'exploration',metric:'islands',name:id,
   target:5,points:1,feature:null,progress:5,claimed:id==='islands-0',enabled:true,ready:false}))};
 const parsed=achievementsSnapshotSchema.safeParse(JSON.parse(JSON.stringify(saved)));
 assert(parsed.success,JSON.stringify(parsed.error));
 assert.deepEqual(parsed.data,saved);
 assert(!achievementsSnapshotSchema.safeParse({...saved,records:{...saved.records,islands:[...islands,'../outside']}}).success);
});
