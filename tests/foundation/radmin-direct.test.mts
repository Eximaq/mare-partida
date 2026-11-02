import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRadminAccess } from '../../tools/local-server-policy.mjs';
import { localEnvironment } from '../../tools/local-server-policy.mjs';
const settings={host:'26.1.2.3',peer:'26.4.5.6',key:'private.key',cert:'public.crt'};
test('direct Radmin configuration rejects wildcard/public/ambiguous addresses and derives one HTTPS origin',()=>{
 assert.equal(readRadminAccess(undefined),undefined);
 const c=readRadminAccess(settings)!;
 assert.equal(c.origin,'https://26.1.2.3:9444');
 assert.deepEqual(c.peers,['26.1.2.3','26.4.5.6']);
 for(const host of ['0.0.0.0','127.0.0.1','1.2.3.4','26.1.2','26.001.2.3','::1']) assert.throws(()=>readRadminAccess({...settings,host}));
 for(const patch of [{peer:settings.host},{peer:'0.0.0.0'},{cert:''},{key:null}]) assert.throws(()=>readRadminAccess({...settings,...patch}));
});
test('private origin override cannot alter credentials, database, policy or API binding',()=>{
 const source={DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:55432/mare_local_alpha',AUTH_PUBLIC_ORIGIN:'https://localhost:9443',SUPABASE_JWT_ALGORITHM:'ES256',SESSION_ABSOLUTE_SECONDS:'86400',SESSION_IDLE_SECONDS:'7200'};
 const env=localEnvironment(source,{},settings);
 assert.equal(env.AUTH_PUBLIC_ORIGIN,'https://26.1.2.3:9444');
 assert.equal(env.HOST,'127.0.0.1');assert.equal(env.PORT,'8788');
 assert.equal(source.AUTH_PUBLIC_ORIGIN,'https://localhost:9443');
 assert.throws(()=>localEnvironment(source,{}, {...settings,host:'0.0.0.0'}));
});
