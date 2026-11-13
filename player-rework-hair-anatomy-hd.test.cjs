const {test}=require('node:test'),assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas'),helper=require('./player-rework-hair-anatomy-hd.js'),colors=require('./tools/paper-doll-96-v3/appearance.js'),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
test('ear forehead and nape keep skin identity independently of hair palette on seven proven original sources',async()=>{
 for(const [s,r]of Object.entries(helper.records)){
 const im=await load('tools/rework-base-hd/assets/'+s+'.png'),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const original=c.getContext('2d').getImageData(0,0,im.width,im.height).data,copy=new Uint8ClampedArray(original),m=helper.masks(s,original,colors);assert.ok(m.skin.some(v=>v));
 for(const [skin,hairColor]of [['original','blue'],['ebony','original'],['light','black']]){
 const out=helper.recolor(s,original,{skin,hairColor},colors);for(let p=0;p<m.skin.length;p++){assert.equal(out[p*4+3],original[p*4+3]);if(skin==='original'&&m.skin[p]||hairColor==='original'&&m.hair[p]||!m.hair[p]&&!m.skin[p])for(let k=0;k<3;k++)assert.equal(out[p*4+k],original[p*4+k]);}
 }
 assert.deepEqual(original,copy);
 }
});
test('unproven source hashes cannot inherit another hair mask',()=>assert.equal(helper.masks('unknown',new Uint8ClampedArray(4),colors),null));

test('base and109 carry share independent skin/hair anatomy palettes in all4directions',async()=>{
 const bi=require('./tools/rework-base-hd/index.json'),ci=require('./tools/rework-weapon-layers-hd/carry-binding-plan.json'),vendor=require('./tools/rework-accessories/vendor.js'),base=require('./player-rework-base-hd.js').create(bi,{vendor}),carry=require('./player-rework-weapon-carry-hd.js').create(bi,ci,{vendor,makeCanvas:createCanvas});
 for(const direction of ['south','north','east','west'])for(const appearance of [{skin:'original',hairColor:'blue'},{skin:'ebony',hairColor:'pink'},{skin:'light',hairColor:'black'}]){
  const r=carry.resolve({item:109,body:'male',action:'idle',direction,appearance,equipment:{weapon:109}});assert.ok(r);const images=new Map();for(const p of carry.requiredFiles(r))images.set(p,await load(p));const a=createCanvas(512,512),b=createCanvas(512,512);
  base.render(a.getContext('2d'),r.base,images,{frame:0,appearance,appearanceAPI:colors,makeCanvas:createCanvas});carry.render(b.getContext('2d'),r,images,{frame:0,appearance,appearanceAPI:colors});
  assert.deepEqual(a.getContext('2d').getImageData(0,0,512,220).data,b.getContext('2d').getImageData(0,0,512,220).data,direction+' '+appearance.skin);
 }
});
