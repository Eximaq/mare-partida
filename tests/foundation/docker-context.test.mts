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
