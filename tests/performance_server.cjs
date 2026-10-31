'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
async function create(root,hook,reference=null){
 const overrides=new Map();
 if(reference){
   if(!/^[a-f0-9]{7,40}$/.test(reference))throw Error('Reference must be a commit hash');
   const cp=require('node:child_process');
   const changed=cp.execFileSync('git',['diff','--diff-filter=M','--name-only',reference,'--'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/);
   for(const file of changed.filter(f=>/\.(js|json|html|css)$/.test(f)))overrides.set(path.resolve(root,file),cp.execFileSync('git',['show',reference+':'+file],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}));
 }
 const source=file=>overrides.get(file)??fs.readFileSync(file,'utf8');
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'content-type':'application/json'});res.end('{}');return;}
 const info=fs.statSync(file),modified=info.mtime.toUTCString(),headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600','Last-Modified':modified};if(req.headers['if-modified-since']===modified){res.writeHead(304,headers);res.end();return;}
 let text=null;if(file===path.join(root,'game.js'))text=source(file).replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=');
 if(file===path.join(root,'paper-doll-96-lobby.js'))text=source(file).replace('if(images.has(file)){','window.__spriteCache||={hits:0,misses:0,inflight:0};if(images.has(file)){window.__spriteCache.hits++;').replace('if(inflight.has(file))return inflight.get(file);','if(inflight.has(file)){window.__spriteCache.inflight++;return inflight.get(file);}window.__spriteCache.misses++;');
 if(file===path.join(root,'tools','paper-doll-96-v3','wardrobe.js'))text=source(file).replace('    function draw(ctx,images,selected,fi,spec,hidden,look) {','    function draw(ctx,images,selected,fi,spec,hidden,look) {window.__composeCount=(window.__composeCount||0)+1;');
 if(text===null&&overrides.has(file))text=overrides.get(file);
 if(text!==null){const data=Buffer.from(text);res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);}else{res.writeHead(200,{...headers,'Content-Length':info.size});fs.createReadStream(file).pipe(res);}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,origin:'http://127.0.0.1:'+server.address().port+'/'};
}
module.exports={create};
