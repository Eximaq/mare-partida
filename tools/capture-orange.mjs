import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const output=path.resolve(process.cwd(),'orange-terrain-evidence');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:670},deviceScaleFactor:1});
  page.on('pageerror',err=>{throw err});
  for(const view of ['rua','praca','cais']){
    await page.goto('http://127.0.0.1:8765/tools/orange-terrain-qa.html?view='+view,{waitUntil:'load'});
    await page.waitForFunction(()=>document.body.dataset.ready==='true'||!!document.body.dataset.error,{timeout:35000});
    const evidence=await page.evaluate(()=>{
      if(document.body.dataset.error)throw Error(document.body.dataset.error);
      const before=document.getElementById('before').getContext('2d').getImageData(0,0,760,490).data;
      const after=document.getElementById('after').getContext('2d').getImageData(0,0,760,490).data;
      let changed=0,count=0;
      for(let y=0;y<490;y+=4)for(let x=0;x<760;x+=4){
        const p=(y*760+x)*4;count++;
        if(Math.abs(before[p]-after[p])+Math.abs(before[p+1]-after[p+1])+Math.abs(before[p+2]-after[p+2])>30)changed++;
      }
      return {changedPercent:Math.round(changed/count*100),status:document.getElementById('status').textContent};
    });
    if(evidence.changedPercent<5)throw Error('Mudança visual insuficiente ('+evidence.changedPercent+'%) na vista '+view);
    await page.screenshot({path:path.join(output,'orange-'+view+'-antes-depois.png'),fullPage:true});
    console.log(view,evidence);
  }
}finally{await browser.close()}
