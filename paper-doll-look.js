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
  function apply(player,value,{production=false}={}){
    if(!player||(production?player.devSandbox===true:player.devSandbox!==true)||!valid(value))return null;
    return {...player,paperDollLook:{version:1,hair:value.hair,outfit:value.outfit}};
  }
  function hidden(player){
    const look=read(player),slots=[];
    if(look.hair==='bald')slots.push('hair');
    // Real equipped torso always wins over the base cosmetic choice.
    if(look.outfit==='base'&&!player?.equipment?.coat)slots.push('outfit');
    return slots;
  }
  function render(player,draft=read(player),message='',equipment=null,defs=[],{production=false}={}){
    const safe=valid(draft)?draft:defaults;
    const fields=Object.entries(choices).map(([key,options])=>`<label>${key==='hair'?'Cabelo':'Roupa padrão'}<select data-doll-look="${key}">${Object.entries(options).map(([id,name])=>`<option value="${id}" ${safe[key]===id?'selected':''}>${name}</option>`).join('')}</select></label>`).join('');
    const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const slots={weapon:'Arma',coat:'Torso',head:'Cabeça',boots:'Pés',legs:'Pernas',cloak:'Capa',gloves:'Mãos'};
    const reasons={'empty-hands':'O Lutador usa mãos livres neste conjunto.','missing-weapon':'Equipe a arma inicial da classe.','wrong-category':'Arma de outra categoria.','missing-art':'Esta peça ainda não tem camada modular.'};
    const equipmentPanel=production?(equipment?.substitutions?.length?`<section class="doll-equipment"><h3>Aparência dos equipamentos</h3><p>As peças abaixo usam o visual padrão disponível. Seus atributos e bônus continuam ativos.</p><ul>${equipment.substitutions.map(i=>`<li>${E(slots[i.slot]||i.slot)} · ${E(defs[i.def]?.name||'Equipamento')}</li>`).join('')}</ul></section>`:''):equipment?`<section class="doll-equipment"><h3>Conjunto de equipamentos</h3><p>${E(equipment.message)}</p>${equipment.issues.length?`<ul>${equipment.issues.map(i=>`<li><strong>${E(slots[i.slot]||i.slot)}${i.def!==null?' · '+E(defs[i.def]?.name||'Item '+i.def):''}</strong><br>${E(reasons[i.reason]||i.reason)}</li>`).join('')}</ul><button type="button" data-doll-kit>Preparar conjunto de teste</button><p>Guarda as peças incompatíveis na mochila e equipa a arma inicial disponível. Se necessário, cria uma arma somente no laboratório. Não altera classe, facção ou save normal.</p>`:''}</section>`:'';
    return `<section class="doll-dressing"><header><h2>Seu personagem</h2><p>Uma aparência compartilhada entre classes e facções.</p></header><div class="doll-dressing-grid"><figure><canvas id="dollLookCanvas" width="252" height="252" aria-label="Prévia animada da aparência"></canvas><figcaption id="dollLookState" role="status">Carregando prévia…</figcaption><label>Direção<select id="dollLookDirection"><option value="south">Frente</option><option value="north">Costas</option><option value="west">Esquerda</option><option value="east">Direita</option></select></label><label>Movimento<select id="dollLookAction"><option value="idle">Repouso</option><option value="walk">Caminhada</option><option value="attack">Ataque</option></select></label></figure><div class="doll-dressing-controls">${fields}<p>${production?'A roupa equipada tem prioridade sobre a roupa padrão. Você pode mudar estas escolhas a qualquer momento.':'Armadura equipada substitui a roupa padrão. Armas e peças ainda sem camadas usam o personagem original.'}</p><p>${production?'A aparência é salva com seu progresso. Classe e facção continuam definindo seu estilo de combate e seus bônus.':'Prévia de laboratório. As alterações ficam somente no save de teste.'}</p><p role="status">${E(message)}</p><div class="doll-dressing-actions"><button type="button" data-doll-look-apply>Aplicar aparência</button><button type="button" data-doll-look-cancel>Descartar alterações</button></div>${equipmentPanel}</div></div></section>`;
  }
  const api={defaults,choices,read,valid,apply,hidden,render};root.MarePaperDollLook=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
