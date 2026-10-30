/* Consolidate the two existing coat models into native animation atlases.
 * Requires Playwright and a running static server; no generation/API calls.
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, 'paper-doll-96-v3');
const origin = process.argv.find(v => /^https?:\/\//.test(v)) || 'http://127.0.0.1:8154/';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    await page.goto(new URL('tools/paper-doll-96-v3/?revision=bake-torso-v8', origin).href);
    await page.waitForFunction(() => window.__review96v3);
    const atlases = await page.evaluate(async () => {
      const q = __review96v3, output = [], dirs = ['south','north','west','east'];
      if (q.manifest.productionEnabled || q.catalog.productionEnabled) throw Error('Use the isolated review library');
      const pixels = async (file, size, frame = 0) => {
        const image = await q.image(file), c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(image, frame*size,0,size,size,0,0,size,size);
        return c.getContext('2d').getImageData(0,0,size,size).data;
      };
      for (const style of q.catalog.styles.filter(s => s.kind === 'torso')) for (const [body, b] of Object.entries(q.manifest.bodies)) {
        for (const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus']) {
          const frames = b.clips[action].east.frames, size = b.clips[action].east.frame?.width || 128, padding = (size-128)/2;
          const columns = size === 160 ? 6 : frames, rows = Math.ceil(frames*4/columns);
          const c = document.createElement('canvas'); c.width = columns*size; c.height = rows*size;
          const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
          for (const direction of ['south','north','east']) {
            const clip = b.clips[action][direction], rig = q.appearanceRigs.clips[body][action][direction];
            const source = await pixels(style.layers[body][direction],128);
            for (let frame=0;frame<frames;frame++) {
              const neutral = document.createElement('canvas'), hands = document.createElement('canvas');
              neutral.width=hands.width=size;neutral.height=hands.height=size;
              for (const slot of ['body','underArms','foreground']) {
                const file=clip.layers[slot];if(!file)continue;const image=await q.image(file);
                if(slot==='body')neutral.getContext('2d').drawImage(image,frame*size,0,size,size,0,0,size,size);
                if(slot!=='body')hands.getContext('2d').drawImage(image,frame*size,0,size,size,0,0,size,size);
              }
              const fitted=MareTorso96.fit(source,neutral.getContext('2d').getImageData(0,0,size,size).data,rig.rest,rig.poses[frame],padding,size,size,hands.getContext('2d').getImageData(0,0,size,size).data).full;
              const index=dirs.indexOf(direction)*frames+frame;
              ctx.putImageData(new ImageData(fitted,size,size),index%columns*size,Math.floor(index/columns)*size);
              if(direction==='east') {
                const flipped=new Uint8ClampedArray(fitted.length);
                for(let y=0;y<size;y++)for(let x=1;x<size;x++)flipped.set(fitted.subarray((y*size+x)*4,(y*size+x+1)*4),(y*size+size-x)*4);
                const west=2*frames+frame;
                ctx.putImageData(new ImageData(flipped,size,size),west%columns*size,Math.floor(west/columns)*size);
              }
            }
          }
          output.push({id:style.id,body,action,file:'assets/torso-'+style.id+'-'+body+'-'+action+'.png',cell:size,columns,rows,framesPerDirection:frames,directions:dirs,png:c.toDataURL().split(',')[1]});
        }
      }
      return output;
    });
    const catalog=JSON.parse(await fs.readFile(path.join(root,'appearance-catalog.json'),'utf8'));
    assert.equal(atlases.length,catalog.styles.filter(s=>s.kind==='torso').reduce((n,s)=>n+Object.keys(s.layers).length*7,0));
    for(const {png,id,body,action,...atlas} of atlases){
      assert.match(atlas.file,/^assets\/torso-item-[0-9]+-(masculino|feminino)-[a-z-]+\.png$/);
      await fs.writeFile(path.join(root,atlas.file),Buffer.from(png,'base64'));
      const style=catalog.styles.find(s=>s.id===id);style.animations??={};style.animations[body]??={};
      style.animations[body][action]={...style.animations[body][action],...atlas};
    }
    for(const style of catalog.styles.filter(s=>s.kind==='torso'))for(const body of Object.keys(style.animations))style.animations[body]['attack-tech']={...style.animations[body]['attack-firearm'],sharedWith:'attack-firearm'};
    await fs.writeFile(path.join(root,'appearance-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
    console.log(JSON.stringify({atlases:atlases.length,distinctFrames:atlases.reduce((n,a)=>n+a.framesPerDirection*a.directions.length,0),paidGenerations:0}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
