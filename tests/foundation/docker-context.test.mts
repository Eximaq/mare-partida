import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('the restricted Docker build context includes every explicitly copied root runtime dependency',()=>{
 const root=new URL('../../',import.meta.url),docker=readFileSync(new URL('infra/docker/game-server.Dockerfile',root),'utf8');
 const allow=new Set(readFileSync(new URL('.dockerignore',root),'utf8').split(/\r?\n/));
 for(const line of docker.split(/\r?\n/).filter(l=>l.startsWith('COPY ')&&!l.includes('--from='))){
  for(const file of line.trim().split(/\s+/).slice(1,-1))if(!file.includes('/')&&file.includes('.')){
   assert(existsSync(new URL(file,root)),`Missing runtime source: ${file}`);
   assert(allow.has('!'+file),`Docker context excludes runtime source: ${file}`);
  }
 }
 assert(allow.has('**'),'Build context remains deny-by-default');
 assert(![...allow].some(l=>l.startsWith('!.env')||l==='!infra/local/**'));
});

test('the shipped root modules can load the authoritative catalog and battle runtime without omitted imports',async()=>{
 const {mkdtempSync,copyFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process');
 const root=new URL('../../',import.meta.url),docker=readFileSync(new URL('infra/docker/game-server.Dockerfile',root),'utf8'),directory=mkdtempSync(join(tmpdir(),'mare-container-modules-'));
 try{
  // Mirror only root JS/CJS files explicitly shipped by the runtime COPY lines.
  // Node resolves their real transitive imports inside this isolated directory.
  for(const line of docker.split(/\r?\n/).filter(l=>l.startsWith('COPY ')&&!l.includes('--from=')&&l.trim().endsWith(' ./')))
   for(const file of line.trim().split(/\s+/).slice(1,-1))if(!file.includes('/')&&/\.(?:js|cjs)$/.test(file))copyFileSync(new URL(file,root),join(directory,file));
  const result=spawnSync(process.execPath,['-e',"require('./akuma-system.js');require('./world-battle.cjs');require('./fruit-runtime.cjs');"],{cwd:directory,encoding:'utf8'});
  assert.equal(result.status,0,`Container runtime import failed: ${result.error?.message||result.stderr}`);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
