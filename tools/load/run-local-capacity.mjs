// Load-test tooling only. The API, domain and workers must be the compiled runtime.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,dirname,basename,resolve} from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url)),temp=join(root,'tmp');
assert(!process.execArgv.some(v=>/tsx|--(?:import|loader)/.test(v))&&!/tsx|--(?:import|loader)/.test(process.env.NODE_OPTIONS??''),'Run without a development loader');
let database;try{database=new URL(process.env.TEST_DATABASE_URL??'');}catch{throw Error('Configure isolated test PostgreSQL');}
assert(['127.0.0.1','localhost','[::1]'].includes(database.hostname)&&database.port!=='55432'&&!/^\/(mare_local_alpha|mare_auth_dev)$/.test(database.pathname),'Use an isolated test cluster; game databases and port55432 are forbidden');
// npm's load:local script builds first; a missing build fails before any database work.
await readFile(join(root,'apps/game-server/dist/auth/service.js'));
await mkdir(temp,{recursive:true});
const dir=await mkdtemp(join(temp,'capacity-runtime-'));
try{
 const support=join(dir,'support.mjs'),runner=join(dir,'runner.mjs'),compiled=pathToFileURL(join(root,'apps/game-server/dist/')).href;
 for(const [source,target] of [['tests/integration/auth-support.mts',support],['tools/load/local-capacity.mts',runner]]){
  let code=stripTypeScriptTypes(await readFile(join(root,source),'utf8'));
  code=code.replaceAll('../../apps/game-server/src/',compiled).replaceAll('../../apps/game-server/dist/',compiled).replaceAll('../../tests/integration/auth-support.mjs',pathToFileURL(support).href);
  assert(!code.includes('../../apps/game-server/src/'),'Uncompiled API import');
  await writeFile(target,code,{mode:0o600});
 }
 await import(pathToFileURL(runner).href);
}finally{
 assert.equal(dirname(resolve(dir)),resolve(temp));assert(basename(dir).startsWith('capacity-runtime-'));
 await rm(dir,{recursive:true,force:true});
}
