import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('Windows launcher resolves an explicitly relocated private resource root without creating a database',{skip:process.platform!=='win32'},async()=>{
 const root=await mkdtemp(join(tmpdir(),'mare-launcher-')),resources=join(root,'packaged data');
 try{
  await mkdir(join(root,'infra/local/continuous'),{recursive:true});await mkdir(join(root,'tools'));
  const portable=join(resources,'node-'+process.version+'-win-x64');await mkdir(portable,{recursive:true});
  await copyFile(process.execPath,join(portable,'node.exe'));
  await copyFile(new URL('../../infra/local-server.ps1',import.meta.url),join(root,'infra/local-server.ps1'));
  await writeFile(join(root,'.node-version'),process.version.slice(1));
  await writeFile(join(root,'infra/local/continuous/settings.json'),JSON.stringify({resourceRoot:resources}));
  await writeFile(join(root,'tools/local-server.mts'),'console.log(JSON.stringify({exe:process.execPath,action:process.argv[2]}))');
  const out=execFileSync('powershell.exe',['-NoProfile','-File',join(root,'infra/local-server.ps1'),'-Action','status'],{encoding:'utf8',env:{...process.env,LOCALAPPDATA:join(root,'old-empty-location')}});
  const result=JSON.parse(out.trim());assert.equal(result.action,'status');assert.equal(result.exe.toLowerCase(),join(portable,'node.exe').toLowerCase());
 }finally{await rm(root,{recursive:true,force:true});}
});
