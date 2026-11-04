import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

test('capacity command measures a complete Party with real HTTP lease renewals and compiled workers',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
 const child=spawn(pkg.scripts['load:local'],{cwd:root,shell:true,windowsHide:true,env:{...process.env,PATH:dirname(process.execPath)+(process.platform==='win32'?';':':')+process.env.PATH,MARE_LOAD_CLIENTS:'4',MARE_LOAD_SECONDS:'32',MARE_LOAD_MODE:'party',MARE_LOAD_SIMULATION:'workers',MARE_LOAD_REPORT:'',SIMULATION_SOLO_WORKERS:'2',SIMULATION_PARTY_WORKERS:'1'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',v=>output+=v);child.stderr.resume();
 const timeout=setTimeout(()=>child.kill(),90000);
 const code=await new Promise<number|null>(resolve=>child.once('exit',resolve));clearTimeout(timeout);
 assert.equal(code,0,'isolated capacity smoke must finish successfully');
 const report=JSON.parse(output.trim().split(/\r?\n/).filter(line=>line.startsWith('{')).at(-1)!);
 assert.equal(report.runtime?.api,'compiled');assert.equal(report.runtime?.apiPoolMax,10);assert.equal(report.runtime?.node,process.version);assert.equal(report.runtime?.developmentLoader,false);
 assert.equal(report.clients,4);assert.equal(report.activity.auto,4);assert.equal(report.passed,true);
 assert.equal(report.parties,1);assert.equal(report.renewals,4);assert.equal(report.renewalFailures,0);
 assert.deepEqual(report.partitionLoad,[{lane:'party',shard:0,total:1}]);assert.equal(report.providerFixtureLifetimeMs,900000);
 assert.deepEqual(report.dropReasons,{schedulerMissed:0,readBusy:0,queueFull:0,aborted:0});
 assert.deepEqual(report.transitions,[]);assert.ok(report.windows.length>=3);
 assert.deepEqual(report.requestFailures,{timeout:0,network:0,invalidResponse:0});
 assert.equal(report.readSlots.planned,report.readSlots.issued);
 assert.ok(Date.parse(report.endedAt)-Date.parse(report.startedAt)>=32000);
});
