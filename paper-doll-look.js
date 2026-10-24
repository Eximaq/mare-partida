'use strict';
/* Cosmetic preferences only: no stats, equipment mutation or storage ownership. */
((root)=>{
  const defaults=Object.freeze({version:1,hair:'short-black',outfit:'navy'});
  const choices={hair:{'short-black':'Curto preto',bald:'Sem cabelo'},outfit:{navy:'Colete azul e linho',base:'Somente corpo-base'}};
  function read(player){
    const value=player?.paperDollLook;
    if(value?.version!==1)return {...defaults};
    return {version:1,...Object.fromEntries(Object.entries(choices).map(([key,options])=>[key,Object.hasOwn(options,value[key])?value[key]:defaults[key]]))};
  }
  function valid(value){return value?.version===1&&Object.entries(choices).every(([key,options])=>Object.hasOwn(options,value[key]));}
  function apply(player,value){
    if(player?.devSandbox!==true||!valid(value))return null;
    return {...player,paperDollLook:{version:1,hair:value.hair,outfit:value.outfit}};
  }
  function hidden(player){
    const look=read(player),slots=[];
    if(look.hair==='bald')slots.push('hair');
    // Real equipped torso always wins over the base cosmetic choice.
    if(look.outfit==='base'&&!player?.equipment?.coat)slots.push('outfit');
    return slots;
  }
  function render(player,draft=read(player),message=''){
    const safe=valid(draft)?draft:defaults;
    const fields=Object.entries(choices).map(([key,options])=>`<label>${key==='hair'?'Cabelo':'Roupa padrão'}<select data-doll-look="${key}">${Object.entries(options).map(([id,name])=>`<option value="${id}" ${safe[key]===id?'selected':''}>${name}</option>`).join('')}</select></label>`).join('');
    const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<section class="doll-dressing"><header><h2>Seu personagem</h2><p>Uma aparência compartilhada entre classes e facções.</p></header><div class="doll-dressing-grid"><figure><canvas id="dollLookCanvas" width="252" height="252" aria-label="Prévia animada da aparência"></canvas><figcaption id="dollLookState" role="status">Carregando prévia…</figcaption><label>Direção<select id="dollLookDirection"><option value="south">Frente</option><option value="north">Costas</option><option value="west">Esquerda</option><option value="east">Direita</option></select></label><label>Movimento<select id="dollLookAction"><option value="idle">Repouso</option><option value="walk">Caminhada</option><option value="attack">Ataque</option></select></label></figure><div class="doll-dressing-controls">${fields}<p>Armadura equipada substitui a roupa padrão. Armas e peças ainda sem camadas usam o personagem original.</p><p>Prévia de laboratório. As alterações ficam somente no save de teste.</p><p role="status">${E(message)}</p><div class="doll-dressing-actions"><button type="button" data-doll-look-apply>Aplicar aparência</button><button type="button" data-doll-look-cancel>Descartar alterações</button></div></div></div></section>`;
  }
  const api={defaults,choices,read,valid,apply,hidden,render};root.MarePaperDollLook=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
