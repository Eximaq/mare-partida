import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {characterCommandSchema} from '@mare/shared';
const require=createRequire(import.meta.url),A=require('../../character-appearance.js'),{validIntent}=require('../../apps/account-client/game-session.js');
const envelope={requestId:randomUUID(),expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)}};
test('profile commands accept only original appearance choices and bounded preferences',()=>{
 for(const [action,payload] of [['profile.appearance',{appearance:A.defaults}],['profile.preferences',{hideItems:true,hideHeadgear:false,healThreshold:.7}],['profile.identity',{name:'Navegante',classId:'healer',factionId:'marine',appearance:A.defaults}]] as const){assert(characterCommandSchema.safeParse({...envelope,action,payload}).success);assert(validIntent(action,payload));for(const key of ['ownerId','gold','level','attack','talents','characterId'])assert(!characterCommandSchema.safeParse({...envelope,action,payload:{...payload,[key]:999}}).success);}
 for(const appearance of [{...A.defaults,gender:'admin'},{...A.defaults,hairColor:'<script>'},{...A.defaults,attack:99}])assert(!characterCommandSchema.safeParse({...envelope,action:'profile.appearance',payload:{appearance}}).success);
 for(const healThreshold of [0,.24,.91,NaN,Infinity])assert(!characterCommandSchema.safeParse({...envelope,action:'profile.preferences',payload:{healThreshold}}).success);
});
