/* A disposable actor. Only the versioned offset document is stored. */
(async function(){
'use strict';
const $=id=>document.getElementById(id),A=MareHDPosition,look=MareCharacterAppearance;
const labels={coat:'Peitoral',legs:'Calça',boots:'Botas',gloves:'Luvas',head:'Cabeça',weapon:'Arma'};
const classes={sword:'Espadachim',rogue:'Gatuno',brawler:'Lutador',cyborg:'Ciborgue',healer:'Curandeiro',gunner:'Atirador',strategist:'Estrategista'};
const equipment={coat:{def:6},boots:{def:148}},appearance={...look.defaults};
const storage='kaizoku-hd-position-draft-v1';
let draft=A.empty(),past=[],future=[],api,catalog,weapons,actor,options,bundle,view,source,controller,ticket=0;
let tick=0,playing=false,elapsed=0,last=0,drawing=false,pan=[0,0],pointer,loadMessage='',editSlot='boots';
function status(message,error=false){$('status').textContent=message;$('status').dataset.error=error;}
function option(select,value,label){select.add(new Option(label,String(value)));}
function selectValues(id,values){const s=$(id);s.replaceChildren();for(const [v,l] of values)option(s,v,l);}
function currentActor(isolate=false){
 const worn=isolate?Object.fromEntries(Object.entries(equipment).filter(([s])=>s==='weapon'||s===editSlot)):equipment;
 return look.apply({classId:$('role').value,equipment:{...worn},preferences:{hideHeadgear:$('hide').checked}},appearance);
}
function pose(){const alias=$('action').value;return {consumer:'world',action:alias==='power'?'attack-unarmed':MarePaperDoll96Lobby.worldAction(alias),direction:$('direction').value,weaponless:alias==='power'};}
function actions(){
 const old=$('action').value,id=equipment.weapon?.def,real=id==null?'attack-unarmed':api.attackActionFor(id)||weapons.items.find(w=>w.itemId===id)?.attackAction||'attack-'+weapons.classes[$('role').value];
 const lobby=MarePaperDoll96Lobby,names={idle:'Repouso',walk:'Caminhada','combat-idle':'Repouso em combate',guard:'Guarda',hurt:'Ferimento',death:'Queda'};
 const choices=lobby.actions.filter(v=>!v.startsWith('attack-')||v===real).map(v=>[v,names[v]||'Ataque · '+v]);
 selectValues('action',[...choices,['skill','Habilidade · '+real],['power','Poder de mãos livres · attack-unarmed'],...lobby.restAliases.map(v=>[v,names[v]+' · repouso'])]);
 if([...$('action').options].some(o=>o.value===old))$('action').value=old;
}
function list(){
 const term=$('search').value.trim().toLocaleLowerCase(),slot=$('filter').value;
 $('catalog').replaceChildren();
 for(const [id,v] of catalog.entries()){
  if(!A.slots.includes(v.slot)||slot&&v.slot!==slot||!(id+' '+v.name+' '+labels[v.slot]).toLocaleLowerCase().includes(term))continue;
  const b=document.createElement('button'),tag=document.createElement('small');b.dataset.id=id;b.textContent=v.name;
  tag.textContent=labels[v.slot]+' · #'+id;b.append(tag);b.setAttribute('aria-pressed',String(equipment[v.slot]?.def===id));$('catalog').append(b);
 }
}
function target(){return view?.targets.find(t=>t.slot===editSlot&&t.part===$('part').value);}
function record(t){return t&&draft.records.find(r=>A.key(r)===A.key(t));}
function phase(){return view?.clock[tick]?.phase??0;}
function values(){const r=record(target());return ($('scope').value==='cycle'?r?.cycle:r?.phases[phase()])||[0,0];}
function displayStyle(){
 const r=record(target());return $('scope').value==='cycle'?r?.style?.cycle||{}:A.styleAt(r,phase());
}
function inputs(){
 const t=target(),v=values(),ready=!!t&&!$('before').checked;
 $('x').value=v[0];$('y').value=v[1];
 const style=displayStyle(),scope=$('scope').value,available=t?view.availableLayers(t,scope==='phase'?phase():null):['native'];
 $('angle').value=style.angle??0;$('size').value=style.size??100;$('flip').checked=!!style.flip;
 if($('layer').dataset.options!==available.join(',')){
  selectValues('layer',available.map(k=>[k,A.layerNames[k]]));$('layer').dataset.options=available.join(',');
 }
 $('layer').value=style.layer??'native';
 for(const id of ['angle','size','flip','layer'])$(id).disabled=!ready;
 const dir=$('direction').value,side=dir==='west'||dir==='east';$('mirror-tools').hidden=!side;
 for(const to of ['west','east'])$('mirror-'+to).disabled=!ready||dir===to||!lateralRecords(t).length;
 for(const e of [$('x'),$('y'),$('reset'),...document.querySelectorAll('[data-move]')])e.disabled=!ready;
 $('undo').disabled=!past.length;$('redo').disabled=!future.length;
 const at=view?.clock.flatMap((v,i)=>v.phase===phase()?[i+1]:[]).join(', ');
 $('clock').textContent=view?'Quadro '+(tick+1)+' / '+view.clock.length+' · fase '+phase()+' · posições '+at:'Fase';
 $('details').textContent=t?'#'+t.item+' · '+t.body+' · '+t.receiver+' · fonte '+t.source.slice(0,12)+(t.limits[phase()]?' · limites da fase em px: X '+t.limits[phase()].slice(0,2).join('…')+', Y '+t.limits[phase()].slice(2).join('…'):' · oculta nesta fase'):'Selecione uma peça com camada própria nesta pose.';
}
function parts(){
 const old=$('part').value,targets=(view?.targets||[]).filter(t=>t.slot===editSlot);
 selectValues('part',targets.sort((a,b)=>Number(b.part==='*')-Number(a.part==='*')).map(t=>[t.part,t.part==='*'?'Peça inteira':t.part]));
 if(targets.some(t=>t.part===old))$('part').value=old;
 inputs();
}
function schedule(){if(!drawing){drawing=true;requestAnimationFrame(paint);}}
function paint(now){
 drawing=false;const c=$('figure'),ctx=c.getContext('2d'),rect=c.getBoundingClientRect(),ratio=devicePixelRatio||1;
 const w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 if(!view)return;
 if(playing&&last){elapsed+=(now-last)*view.fps*Number($('speed').value)/1000;
  if(elapsed>=1){let next=tick+Math.floor(elapsed);elapsed%=1;if(next>=view.clock.length&&!$('loop').checked){next=view.clock.length-1;toggle(false);}setTick(next%view.clock.length);}}
 last=now;
 const zoom=+$('zoom').value,origin=[Math.round(w/2+pan[0]*ratio-view.pivot.x*zoom*ratio),Math.round(h*.82+pan[1]*ratio-view.pivot.y*zoom*ratio)];
 ctx.setTransform(zoom*ratio,0,0,zoom*ratio,...origin);ctx.imageSmoothingEnabled=false;
 const info=bundle.drawNative(ctx,{...options,progress:(tick+.25)/view.clock.length},$('before').checked);
 if($('guides').checked&&info){
  const marks=[view.pivot],dir=source.pack?.directions[source.direction],joints=info.pose||dir?.poses?.[view.clock[tick].frame]||dir?.rest||{};
  const density=info.density||4,pad=source.paddingPhysical||0;
  for(const [name,p] of Object.entries(joints))if(/hand|wrist|ankle|foot|arm$|pé/i.test(name)&&Number.isFinite(p?.x)&&Number.isFinite(p?.y))marks.push({x:p.x*density+pad,y:p.y*density+pad});
  ctx.strokeStyle='#f0c36a';ctx.lineWidth=1/(ratio*zoom);for(const {x,y} of marks){ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();}
 }
 if(playing)schedule();
}
function setTick(i){tick=i;$('tick').value=i;inputs();}
function toggle(v){playing=v;last=0;elapsed=0;$('play').textContent=v?'Pausar':'Reproduzir';schedule();}
async function prepare(a,o,signal){
 const r=MarePaperDoll96Lobby.selectWorldHDOnly(api,weapons,a,o);
 if(!r)throw Error('O seletor do mapa não encontrou a pose solicitada.');
 const b=await api.prepareConfiguration([{player:a,options:o}],{signal,inspectPositions:true,resolve:()=>({player:a,options:o,source:r})});
 return {b,r,v:b.positionView(o)};
}
async function reload(){
 const id=++ticket;controller?.abort();controller=new AbortController();const {signal}=controller;
 pointer=null;bundle?.release();bundle=view=source=null;parts();schedule();status('Carregando a configuração…');
 actor=currentActor($('solo').checked);options=pose();
 try{
  const {r,b,v}=await prepare(actor,options,signal);
  if(signal.aborted||ticket!==id){b.release();return;}
  bundle=b;source=r;view=v;tick=0;last=elapsed=0;$('tick').max=v.clock.length-1;$('tick').value=0;
  const missing=b.coverage[0].omitted||[];loadMessage=r.action+' · '+r.direction+' · '+v.clock.length+' posições'+(missing.length?' · sem desenho: '+missing.join(', '):'');
  parts();schedule();v.set(draft);status(loadMessage,missing.length>0);
 }catch(e){if(!signal.aborted)status(e.message,true);}
}
function commit(next,history=true){
 A.validate(next);view?.set(next);
 try{localStorage.setItem(storage,JSON.stringify(next));}catch(e){view?.set(draft);throw e;}
 if(history){past.push(draft);if(past.length>80)past.shift();future=[];}
 draft=next;inputs();schedule();status(loadMessage);
}
function update(v,restore=false,remember=true,change=null){
 const t=target();if(!t||$('before').checked)return;
 try{
  const {limits,...identity}=t,r=structuredClone(record(t)||{...identity,cycle:[0,0],phases:{}});
  const cycle=$('scope').value==='cycle';
  if(change){
   r.style??={cycle:{},phases:{}};const f=phase(),s=cycle?r.style.cycle:(r.style.phases[f]??={});
   const [key,val]=Object.entries(change)[0],defaults={angle:0,size:100,flip:false,layer:'native'};
   const inherited=cycle?defaults[key]:(r.style.cycle[key]??defaults[key]);
   if(val===inherited)delete s[key];else s[key]=val;
   if(!cycle&&!Object.keys(s).length)delete r.style.phases[f];
   if(!Object.keys(r.style.cycle).length&&!Object.keys(r.style.phases).length)delete r.style;
  }else if(cycle)r.cycle=v;else r.phases[phase()]=v;
  for(const k of Object.keys(r.phases))if(r.phases[k].every(n=>n===0))delete r.phases[k];
  const rows=draft.records.filter(a=>A.key(a)!==A.key(t));
  if(!restore&&(r.style||r.cycle.some(Boolean)||Object.keys(r.phases).length))rows.push(r);
  commit({...draft,schema:r.style?2:draft.schema,revision:draft.revision+1,records:rows},remember);
 }catch(e){inputs();status(e.message,true);}
}
function history(from,to){
 if(!from.length)return;try{const old=draft;commit(from.at(-1),false);from.pop();to.push(old);inputs();}catch(e){status(e.message,true);}
}
function lateralRecords(t){
 return draft.records.filter(r=>r.slot===t.slot&&r.item===t.item&&r.body===t.body&&r.action===t.action&&r.receiver===t.receiver&&r.direction===t.direction&&(r.slot!=='weapon'||r.weapon===t.weapon)&&(t.part==='*'||r.part===t.part));
}
async function copyLateral(direction){
 const t=target(),from=view,current=ticket,previous=draft,selected=editSlot;
 if(!t||$('before').checked||t.direction===direction||!['east','west'].includes(t.direction))return;
 const rows=lateralRecords(t);if(!rows.length)return;
 let other;
 try{
  status('Conferindo a arte e as fases do lado de destino…');
  other=await prepare(actor,{...options,direction},controller.signal);
  if(ticket!==current||draft!==previous||target()!==t||editSlot!==selected||$('before').checked)return;
  if(from.fps!==other.v.fps)throw Error('O ritmo da pose é diferente no outro lado.');
  const candidates=other.v.targets.filter(v=>v.slot===t.slot&&v.item===t.item),copies=[];
  const lateralName=s=>s.replace(/\b(east|west)\b/gi,'side').replace(/([_-])(east|west)(?=[_-]|$)/gi,'$1side');
  for(const r of rows){
   const exact=candidates.filter(v=>v.part===r.part),same=exact.length?exact:candidates.filter(v=>lateralName(v.part)===lateralName(r.part));
   if(same.length!==1)throw Error('Sem parte lateral correspondente para '+r.part);
   copies.push(A.mirrorRecord(r,same[0],from.clock,other.v.clock));
  }
  const dest=new Set((t.part==='*'?candidates:copies).map(A.key));
  const next={...draft,revision:draft.revision+1,records:[...draft.records.filter(r=>!dest.has(A.key(r))),...copies]};
  other.v.set(next);commit(next);
  $('direction').value=direction;await reload();
 }catch(e){if(current===ticket)status(e.message,true);}finally{other?.b.release();}
}
async function verifyImport(m){
 A.validate(m);
 const groups=new Map();
 for(const r of m.records){
  if(catalog[r.item]?.slot!==r.slot||r.weapon!==null&&catalog[r.weapon]?.slot!=='weapon')throw Error('ID incompatível com o catálogo.');
  const k=JSON.stringify([r.body,r.weapon,r.action,r.direction,r.slot,r.item]);
  if(!groups.has(k))groups.set(k,r);
 }
 for(const r of groups.values()){
  const a=currentActor();a.appearance96={...a.appearance96,gender:r.body==='male'?'masculino':'feminino'};
  a.preferences={hideHeadgear:false};a.equipment={[r.slot]:{def:r.item}};if(r.weapon!==null){a.equipment.weapon={def:r.weapon};a.classId=catalog[r.weapon].type;}
  const o={consumer:'world',action:r.action,direction:r.direction},test=await prepare(a,o);
  try{if(!test.v.targets.some(t=>A.key(t)===A.key(r)&&t.source===r.source))throw Error('Fonte incompatível para #'+r.item+' · '+r.direction);test.v.set(m);}finally{test.b.release();}
 }
}
try{
 let startupError='';status('Lendo armas e aparências…');api=MareReworkNativeHD.create();const result=await Promise.all([fetch('tools/paper-doll-96-v3/weapons.json').then(r=>r.json()),fetch('hd-position-approved.json',{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return A.validate(await r.json());}).catch(e=>{startupError='Ajustes publicados indisponíveis · '+e.message;return A.empty();}),api.ready]);
 weapons=result[0];draft=result[1];
 catalog=MareItemCatalog.create({forge:MareForge,prison:MarePrison,haki:MareHaki,akuma:MareAkuma,hakiProgression:MareHakiProgression}).items;
 let draftError='';try{const saved=localStorage.getItem(storage);if(saved)draft=A.validate(JSON.parse(saved));}catch(e){draftError=e.message;}
 selectValues('filter',[['','Todas as categorias'],...Object.entries(labels)]);selectValues('slot',Object.entries(labels));$('slot').value=editSlot;
 selectValues('role',Object.keys(weapons.classes).map(k=>[k,classes[k]||k]));
 for(const [k,choices] of Object.entries(look.choices)){
  if(Object.keys(choices).length===1)continue;const label=document.createElement('label'),s=document.createElement('select');label.textContent=look.names[k];label.append(s);
  for(const [v,n] of Object.entries(choices))option(s,v,n);s.value=appearance[k];s.id='look-'+k;s.onchange=()=>{appearance[k]=s.value;reload();};$('appearance').append(label);
 }
 $('search').oninput=$('filter').onchange=list;
 $('catalog').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;const id=+b.dataset.id,v=catalog[id];equipment[v.slot]={def:id};editSlot=v.slot;$('slot').value=v.slot;if(v.slot==='weapon')$('role').value=v.type;actions();list();reload();};
 $('remove').onclick=()=>{delete equipment[editSlot];actions();list();reload();};
 $('role').onchange=()=>{if(equipment.weapon&&catalog[equipment.weapon.def].type!==$('role').value)delete equipment.weapon;actions();list();reload();};
 $('direction').onchange=$('action').onchange=$('hide').onchange=$('solo').onchange=reload;
 $('slot').onchange=()=>{editSlot=$('slot').value;if($('solo').checked)reload();else parts();};
 $('part').onchange=$('scope').onchange=inputs;$('before').onchange=()=>{inputs();schedule();};
 $('guides').onchange=$('zoom').oninput=schedule;$('play').onclick=()=>toggle(!playing);
 const step=d=>{if(!view)return;toggle(false);const phase0=phase();let i=tick;do{i=(i+d+view.clock.length)%view.clock.length;}while(i!==tick&&view.clock[i].phase===phase0);setTick(i);schedule();};
 $('next').onclick=()=>step(1);$('prev').onclick=()=>step(-1);$('tick').oninput=()=>{toggle(false);setTick(+$('tick').value);schedule();};
 for(const id of ['angle','size','flip','layer'])$(id).onchange=()=>{const el=$(id);update(values(),false,true,{[id]:id==='flip'?el.checked:id==='layer'?el.value:el.valueAsNumber});};
 for(const dir of ['west','east'])$('mirror-'+dir).onclick=()=>copyLateral(dir);
 $('x').onchange=$('y').onchange=()=>update([$('x').valueAsNumber,$('y').valueAsNumber]);
 document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const d=b.dataset.move.split(',').map(Number);update(values().map((n,i)=>n+d[i]));});
 $('undo').onclick=()=>history(past,future);$('redo').onclick=()=>history(future,past);$('reset').onclick=()=>update([0,0],true);
 const canvas=$('figure');canvas.onpointerdown=e=>{
  if(!view||!e.isPrimary||e.button>1)return;const move=e.shiftKey||e.button===1;if(!move&&(!target()||$('before').checked))return;toggle(false);canvas.setPointerCapture(e.pointerId);
  pointer={id:e.pointerId,start:[e.clientX,e.clientY],initial:move?[...pan]:values(),move,draft,changed:false};
 };
 let dragFrame=0;canvas.onpointermove=e=>{
  if(pointer?.id!==e.pointerId)return;const p=pointer,zoom=p.move?1:+$('zoom').value;
  const xy=p.initial.map((v,i)=>v+Math.round(((i?e.clientY:e.clientX)-p.start[i])/zoom));
  cancelAnimationFrame(dragFrame);dragFrame=requestAnimationFrame(()=>{if(pointer!==p)return;if(p.move){pan=xy;schedule();}else{update(xy,false,false);p.changed=draft!==p.draft;}});
 };
 canvas.onpointerup=canvas.onpointercancel=e=>{if(pointer?.id!==e.pointerId)return;cancelAnimationFrame(dragFrame);
  const p=pointer;if(!p.move&&e.type==='pointerup'){const z=+$('zoom').value;const v=p.initial.map((n,i)=>n+Math.round(((i?e.clientY:e.clientX)-p.start[i])/z));if(v.some((n,i)=>n!==values()[i]))update(v,false,false);}
  if(draft!==p.draft){past.push(p.draft);future=[];inputs();}pointer=null;};
 $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hd-position-approved.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;const original=draft;
  try{const m=JSON.parse(await file.text());status('Conferindo fontes e limites…');await verifyImport(m);if(draft!==original)throw Error('O rascunho mudou durante a importação.');commit(m);}catch(err){status(err.message,true);}finally{e.target.value='';}};
 new ResizeObserver(schedule).observe($('viewport'));actions();list();await reload();if(draftError||startupError)status([startupError,draftError&&'Rascunho local inválido · '+draftError].filter(Boolean).join(' · '),true);
}catch(e){status(e.message,true);}
})();
