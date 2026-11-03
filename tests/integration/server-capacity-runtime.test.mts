import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

test('capacity command measures the compiled API and actual worker runtime without a development loader',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
 const child=spawn(pkg.scripts['load:local'],{cwd:root,shell:true,windowsHide:true,env:{...process.env,PATH:dirname(process.execPath)+(process.platform==='win32'?';':':')+process.env.PATH,MARE_LOAD_CLIENTS:'4',MARE_LOAD_SECONDS:'10',MARE_LOAD_MODE:'mixed',MARE_LOAD_SIMULATION:'workers',MARE_LOAD_REPORT:'',SIMULATION_SOLO_WORKERS:'2',SIMULATION_PARTY_WORKERS:'1'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',v=>output+=v);child.stderr.resume();
 const timeout=setTimeout(()=>child.kill(),90000);
 const code=await new Promise<number|null>(resolve=>child.once('exit',resolve));clearTimeout(timeout);
 assert.equal(code,0,'isolated capacity smoke must finish successfully');
 const report=JSON.parse(output.trim().split(/\r?\n/).filter(line=>line.startsWith('{')).at(-1)!);
 assert.equal(report.runtime?.api,'compiled');assert.equal(report.runtime?.apiPoolMax,10);assert.equal(report.runtime?.node,process.version);assert.equal(report.runtime?.developmentLoader,false);
 assert.equal(report.clients,4);assert.equal(report.activity.auto,4);assert.equal(report.passed,true);
});
