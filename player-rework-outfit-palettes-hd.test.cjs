const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createCanvas}=require('@napi-rs/canvas'),index=require('./tools/rework-modular-outfits-hd/index.json'),vendor=require('./tools/rework-accessories/vendor.js'),colors=require('./tools/paper-doll-96-v3/appearance.js'),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
let checks=0;const appearanceAPI={...colors,recolor(source,mask,ramp){const result=colors.recolor(source,mask,ramp);for(let i=0;i<mask.length;i++){assert.equal(source[i*4+3],result[i*4+3]);if(!mask[i])for(let k=0;k<3;k++)assert.equal(source[i*4+k],result[i*4+k]);}checks++;return result;}};
const api=require('./player-rework-modular-outfits-hd.js').create(index,{vendor,allowCandidates:true,appearanceAPI});
test('unproven fused wardrobes cannot claim palette support',()=>{assert.equal(api.resolve({body:'female',direction:'south',action:'walk',equipment:{torso:6,pants:147,gloves:152,boots:155},appearance:{skin:'ebony',hairColor:'pink'}}),null);});
test('three real palettes preserve source alpha and all unmasked pixels in idle walk and attack in four directions',async()=>{
 for(const [skin,hairColor]of [['light','black'],['ebony','pink'],['porcelain','blue']]){
 const gallery=createCanvas(2560,1920),gc=gallery.getContext('2d');gc.fillStyle='#38404a';gc.fillRect(0,0,2560,1920);
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
  const r=api.resolve({body:'male',direction,action,equipment:{pants:133,boots:9},appearance:{skin,hairColor}});assert.ok(r);const d=r.pack.directions[direction],images=new Map();for(const p of api.requiredFiles(r))images.set(p,await load(p));
  const frame=action==='attack-unarmed'?3:0,c=createCanvas(r.pack.frame.width*4,r.pack.frame.height*4);api.render(c.getContext('2d'),r,images,{frame,makeCanvas:createCanvas});
  const x=['south','north','east','west'].indexOf(direction)*640,y=['idle','walk','attack-unarmed'].indexOf(action)*640;gc.drawImage(c,x+(640-c.width)/2,y+(640-c.height)/2);gc.fillStyle='white';gc.font='24px sans-serif';gc.fillText(skin+'/'+hairColor+' '+direction+' '+action,x+10,y+30);
 }
 fs.writeFileSync('/tmp/outfit-palette-'+skin+'.png',gallery.toBuffer('image/png'));
 }
 assert.ok(checks>100);console.log(checks+' recolor calls verified, no unmasked pixel or alpha altered');
});

test('palette API may become available after registry construction without freezing an unsupported identity',()=>{
 const prior=global.MareAppearance96;delete global.MareAppearance96;
 try{const late=require('./player-rework-modular-outfits-hd.js').create(index,{vendor,allowCandidates:true}),q={body:'male',direction:'south',action:'idle',equipment:{pants:133,boots:9},appearance:{skin:'light',hairColor:'black'}};assert.equal(late.resolve(q),null);global.MareAppearance96=colors;assert.equal(late.resolve(q).colorAppearance.skin,'light');}finally{global.MareAppearance96=prior;}
});
