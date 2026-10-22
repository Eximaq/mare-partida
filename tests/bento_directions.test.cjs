const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const scope={Image:class{constructor(){this.complete=true;this.naturalWidth=1000;}addEventListener(){}},window:{dispatchEvent(){}},Event:class{}};
vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'faction-sprites.js'),'utf8'),scope);
vm.runInContext(fs.readFileSync(path.join(root,'combat-assets.js'),'utf8'),scope);
const review=JSON.parse(fs.readFileSync(path.join(root,'pixellab-pip-generations/bento-combat-production-20261018/visual-review.json'),'utf8'));
const api=scope.MareFactionSprites;
api.ensure('pirate-sword');
for(const [action,clip] of Object.entries(api.assets['pirate-sword'].meta.animations)){
  const image=api.assets['pirate-sword'].sheets[action];
  image.naturalWidth=api.assets['pirate-sword'].meta.frame_size[0]*clip.frames;
  image.naturalHeight=api.assets['pirate-sword'].meta.frame_size[1]*4;
}
for(const key of Object.keys(review.rejected)){
    const [name,direction]=key.split('/'),action=name==='corte-de-mare'?'skill':name;
    assert.equal(api.frame('pirate-sword',action,direction,.3),null,key+' must not play a rejected clip');
    assert(api.frame('pirate-sword','guard',direction,0),key+' must retain the original armed directional guard');
}
for(const d of ['south','north','west','east'])assert(api.frame('pirate-sword','death',d,99));
for(const key of review.accepted_for_runtime_with_recorded_caveats){
    const [name,direction]=key.split('/'),action=name==='corte-de-mare'?'skill':name;
    const frame=api.frame('pirate-sword',action,direction,0);assert(frame,key+' must play an accepted clip');
    if(frame.animation.loop===false)assert.equal(api.frame('pirate-sword',action,direction,100).index,frame.animation.frames-1);
}
console.log('Direction review: rejected clips excluded, original armed guards available, all death directions preserved.');
