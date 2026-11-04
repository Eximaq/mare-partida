/* Local art bench. Does not read game saves or change the published catalog. */
(function(){
 'use strict';
 window.MareHeadgearEditor={mount({catalog,onChange}){
  const api=MareAppearance96,$=id=>document.getElementById(id),host=$('headgear-editor'),key='mare-head-fit-editor-v1',revision=catalog.headAdjustmentRevision||'base';
  let draft=api.headAdjustmentSet(catalog.headAdjustments||{},catalog.styles),dirty=false,lastTile=null,drag=null;
  host.innerHTML=`<h2>Ajuste manual · peças de cabeça</h2><p>Escolha uma peça, corpo e direção. Arraste a arte ampliada ou use as setas. Os valores valem para todas as poses daquela vista.</p>
  <div class="fit-layout"><div><div class="controls"><label>Peça <select id="fit-item"></select></label><label>Corpo <select id="fit-body"></select></label><label>Direção <select id="fit-direction"></select></label><label>Movimento <select id="fit-action"></select></label><button type="button" id="fit-play">Pausar</button><label>Quadro <input id="fit-frame" type="range" min="0" max="7" value="0"></label></div>
  <div class="fit-values"><label>Esquerda / direita <input id="fit-x" type="number" min="-32" max="32" step="1"></label><label>Altura (− sobe / + desce) <input id="fit-y" type="number" min="-32" max="32" step="1"></label><label>Tamanho (%) <input id="fit-scale" type="number" min="75" max="125" step="1"></label></div>
  <div class="controls"><button type="button" data-nudge="-1,0" aria-label="Mover um pixel para a esquerda">←</button><button type="button" data-nudge="1,0" aria-label="Mover um pixel para a direita">→</button><button type="button" data-nudge="0,-1" aria-label="Subir um pixel">↑</button><button type="button" data-nudge="0,1" aria-label="Descer um pixel">↓</button><button type="button" id="fit-reset">Restaurar esta vista</button><label>Ampliação <select id="fit-zoom"><option value="4">4×</option><option value="6" selected>6×</option></select></label></div>
  <p id="fit-context"></p><div class="controls"><button type="button" id="fit-save">Salvar rascunho</button><button type="button" id="fit-export">Exportar para integração</button><label class="fit-import">Importar ajustes <input id="fit-import" type="file" accept=".json,application/json"></label><button type="button" id="fit-discard">Descartar rascunho</button></div><p id="fit-status" role="status"></p><p>O rascunho fica apenas nesta bancada. Para publicar no jogo, exporte o arquivo e envie para integração. Oeste acompanha o espelho de Leste.</p></div>
  <canvas id="fit-canvas" width="480" height="408" aria-label="Prévia ampliada para arrastar a peça de cabeça"></canvas></div>`;
  const pairs=[['fit-item','look-head'],['fit-body','body'],['fit-direction','direction'],['fit-action','action']];
  const message=text=>$('fit-status').textContent=text;
  const context=()=>({id:$('look-head').value,body:$('body').value,direction:$('direction').value,dir:$('direction').value==='west'?'east':$('direction').value});
  const current=()=>{const c=context();return api.headAdjustment(draft[c.id]?.[c.body]?.[c.dir]);};
  function sync(){
   const c=context(),fit=current(),valid=catalog.styles.some(s=>s.kind==='head'&&s.id===c.id);
   for(const [local,global]of pairs)$(local).value=$(global).value;
   $('fit-x').value=c.direction==='west'?-fit.x:fit.x;$('fit-y').value=fit.y;$('fit-scale').value=fit.scale;
   host.querySelectorAll('[data-nudge],#fit-x,#fit-y,#fit-scale,#fit-reset').forEach(el=>el.disabled=!valid);
   $('fit-context').textContent=valid?`${c.id} · ${c.body==='masculino'?'Masculino':'Feminino'} · ${$('direction').selectedOptions[0].textContent} · 1 unidade = 1 pixel nativo`:'Selecione uma peça de cabeça para ajustar.';
  }
  function set(value){
   const c=context();if(!catalog.styles.some(s=>s.id===c.id&&s.kind==='head'))return;
   const fit=api.headAdjustment(value);(draft[c.id]??={})[c.body]??={};draft[c.id][c.body][c.dir]=fit;dirty=true;sync();message('Alterações na prévia; salve o rascunho para conservar neste navegador.');onChange();
  }
  for(const [local,global]of pairs){$(local).innerHTML=$(global).innerHTML;$(local).addEventListener('change',()=>{$(global).value=$(local).value;$(global).dispatchEvent(new Event('change',{bubbles:true}));});$(global).addEventListener('change',sync);}
  for(const id of ['fit-x','fit-y','fit-scale'])$(id).addEventListener('input',()=>{try{const c=context();set({x:Number($('fit-x').value)*(c.direction==='west'?-1:1),y:Number($('fit-y').value),scale:Number($('fit-scale').value)});}catch(e){message(e.message);}});
  for(const el of host.querySelectorAll('[data-nudge]'))el.addEventListener('click',()=>{try{const [x,y]=el.dataset.nudge.split(',').map(Number),c=context(),fit=current();set({...fit,x:fit.x+x*(c.direction==='west'?-1:1),y:fit.y+y});}catch(e){message(e.message);}});
  $('fit-play').addEventListener('click',()=>$('play').click());
  $('fit-frame').addEventListener('input',()=>{$('frame').value=$('fit-frame').value;$('frame').dispatchEvent(new Event('input'));});
  $('fit-reset').addEventListener('click',()=>{const c=context();set(api.headAdjustment(catalog.headAdjustments?.[c.id]?.[c.body]?.[c.dir]));});
  const snapshot=()=>({format:'mare-headgear-fit-v1',baseRevision:revision,adjustments:structuredClone(draft)});
  function importValues(value){if(!value||typeof value!=='object'||value.format!=='mare-headgear-fit-v1'||value.baseRevision!==revision)throw Error('O arquivo pertence a outra revisão da arte. Conserve-o para conciliar na integração.');draft=api.headAdjustmentSet(value.adjustments,catalog.styles);dirty=true;sync();onChange();}
  $('fit-save').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify(snapshot()));dirty=false;message('Rascunho salvo neste navegador. O jogo publicado permanece igual.');}catch(e){message('Não foi possível salvar. Exporte o arquivo para conservar seus ajustes.');}});
  $('fit-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='kaizoku-encaixes-cabeca.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Arquivo exportado. Envie-o para integrar os ajustes no jogo.');});
  $('fit-import').addEventListener('change',async()=>{try{const file=$('fit-import').files[0];if(!file)return;if(file.size>256000)throw Error('Arquivo de ajustes muito grande.');importValues(JSON.parse(await file.text()));message('Arquivo carregado na prévia. Confira e salve o rascunho.');}catch(e){message(e.message);}finally{$('fit-import').value='';}});
  $('fit-discard').addEventListener('click',()=>{draft=api.headAdjustmentSet(catalog.headAdjustments||{},catalog.styles);dirty=false;try{localStorage.removeItem(key);}catch(e){}sync();onChange();message('Rascunho descartado; encaixes publicados restaurados.');});
  try{const saved=localStorage.getItem(key);if(saved){importValues(JSON.parse(saved));dirty=false;message('Rascunho salvo restaurado.');}}catch(e){message(e.message);}
  const canvas=$('fit-canvas');
  canvas.addEventListener('pointerdown',e=>{if($('fit-x').disabled)return;drag={x:e.clientX,y:e.clientY,fit:current(),direction:context().direction};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const ratio=canvas.width/canvas.getBoundingClientRect().width,zoom=Number($('fit-zoom').value),dx=Math.round((e.clientX-drag.x)*ratio/zoom),dy=Math.round((e.clientY-drag.y)*ratio/zoom);try{set({...drag.fit,x:drag.fit.x+dx*(drag.direction==='west'?-1:1),y:drag.fit.y+dy});}catch(e){message(e.message);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  function draw(tile){$('fit-play').textContent=$('play').textContent;$('fit-frame').max=$('frame').max;$('fit-frame').value=$('frame').value;if(tile)lastTile=tile;if(!lastTile)return;const zoom=Number($('fit-zoom').value),density=lastTile.mareDensity||1,spec=lastTile.mareSpec||{width:128,height:128},sx=(spec.width-128)/2+24,sy=(spec.pivot?.y||112)-112;canvas.width=80*zoom;canvas.height=68*zoom;const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#192d38';x.fillRect(0,0,canvas.width,canvas.height);x.drawImage(lastTile,sx*density,sy*density,80*density,68*density,0,0,canvas.width,canvas.height);}
  $('fit-zoom').addEventListener('change',()=>draw());sync();
  return {override:current,draw,sync,snapshot,importValues,get dirty(){return dirty;}};
 }};
})();
