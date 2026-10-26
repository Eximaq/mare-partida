'use strict';
/* Temporary, explicitly entered sandbox. Never promote this save into normal progression. */
((root)=>{
  const ENABLED=true,NORMAL_KEY='mare-partida-save-v1',DEV_KEY='mare-partida-dev-save-v1';
  const clone=x=>JSON.parse(JSON.stringify(x)),active=search=>ENABLED&&new URLSearchParams(search).get('dev')==='1';
  const key=search=>active(search)?DEV_KEY:NORMAL_KEY;
  function copy(g){return {...clone(g),devSandbox:true,devOptions:{godMode:false,infiniteWill:false,noCooldown:false}};}
  function seed(storage,g,{replace=false}={}){
    try{if(!ENABLED)return {ok:false,message:'Menu dev desativado.'};if(!replace&&storage.getItem(DEV_KEY))return {ok:true};if(!g)return {ok:false,message:'Crie um personagem antes de abrir o laboratório.'};storage.setItem(DEV_KEY,JSON.stringify(copy(g)));return {ok:true};}
    catch{return {ok:false,message:'Não foi possível criar o save de teste. Seu jogo normal foi preservado.'};}
  }
  function boot(storage,search){
    if(!active(search))return {ok:true};
    try{if(storage.getItem(DEV_KEY))return {ok:true};const raw=storage.getItem(NORMAL_KEY);return raw?seed(storage,JSON.parse(raw)):{ok:true};}catch{return {ok:false,message:'Não foi possível ler o save para testes.'};}
  }
  function targetURL(href,on){const url=new URL(href);if(on)url.searchParams.set('dev','1');else {url.searchParams.delete('dev');url.searchParams.delete('paperDollReview');}return url.href;}
  const canImport=(g,on)=>on||!g?.devSandbox;
  function execute(original,command,ctx={}){
    if(!ENABLED||ctx.active!==true||original?.devSandbox!==true)return {ok:false,message:'Entre no laboratório para usar comandos dev.'};
    const g=clone(original),T=root.MareTalents,C=root.MareCharacters,H=root.MareHaki,A=root.MareAchievements,defs=ctx.defs||[];
    const fail=message=>({ok:false,message}),number=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
    function grant(def,count=1,rarity=null,level=1,plus=0){
      if(!def||!number(count,1,25)||g.inventory.length+count>120)return false;
      for(let i=0;i<count;i++){const item=ctx.makeItem(def,level,rarity);if(!def.kind)item.plus=plus;item.origin='Laboratório DEV';g.inventory.push(item);}return true;
    }
    switch(command.type){
      case 'level':if(!number(command.level,1,200))return fail('Escolha um nível inteiro entre 1 e 200.');g.level=command.level;g.xp=0;break;
      case 'class':{
        if(!T.trees[command.classId])return fail('Classe inválida.');if(g.classId===command.classId)break;
        if(g.equipment.weapon&&g.inventory.length>=120)return fail('Libere um espaço para guardar a arma atual.');
        if(g.equipment.weapon)g.inventory.push(g.equipment.weapon);g.classId=command.classId;g.equipment.weapon=ctx.makeItem(defs[ctx.starterWeapon(command.classId)],1,null);break;
      }
      case 'supplies':g.gold=Math.min(1e9,g.gold+1000000);g.materials=Math.min(1e9,g.materials+10000);g.potions=Math.min(10000,g.potions+100);break;
      case 'item':{
        const def=defs[command.index];if(!def||!number(command.count,1,25)||!number(command.level,1,100)||!number(command.plus,0,20)||!root.MareForge.rarity[command.rarity])return fail('Item, quantidade, nível ou raridade inválidos.');
        if(!grant(def,command.count,def.kind?null:command.rarity,command.level,command.plus))return fail('Mochila cheia. Nenhum item foi criado.');break;
      }
      case 'haki-kit':g.level=Math.max(50,g.level);if(!grant(defs.find(d=>d.kind==='haki-book')))return fail('Libere um espaço para o livro.');break;
      case 'haki-unlock':{
        g.level=Math.max(50,g.level);if(!g.has_haki_unlocked){const found=g.inventory.find(i=>defs[i.def]?.kind==='haki-book'&&!i.locked);if(!found&&!grant(defs.find(d=>d.kind==='haki-book')))return fail('Libere um espaço para o livro.');const book=found||g.inventory.at(-1),r=H.unlock(g,book.id,defs);if(!r.ok)return r;Object.assign(g,r.state);for(const id of H.ids)Object.assign(g,A.record(g,'hakiUnlocked',id));}break;
      }
      case 'haki-lock':g.has_haki_unlocked=false;g.haki={...g.haki,unlocked:false,auto:null,current:100};break;
      case 'will':if(!number(command.amount,0,100))return fail('Vontade deve ficar entre 0 e 100.');g.haki.current=command.amount;break;
      case 'attributes-reset':g.attributes=C.empty();break;
      case 'talents-reset':g.talentBuilds[g.classId]=T.empty();g.talentSeq++;break;
      case 'build':{
        const tree=T.getTree(g.classId),build={nodes:Object.fromEntries(tree.branches[0].nodes.map(n=>[n.id,10])),keystone:command.keystone,ultimate:command.ultimate||null};
        g.level=Math.max(80,g.level);const error=T.validate(g.classId,build,T.totalEarned(g));if(error)return fail(error);g.talentBuilds[g.classId]=build;g.talentSeq++;break;
      }
      case 'achievement':{
        const a=A.list(g).find(a=>a.id===command.id);if(!a?.enabled)return fail('Esta conquista pertence a um sistema indisponível.');
        const r=g.achievements.records;
        if(a.metric==='kills')g.stats.kills=Math.max(g.stats.kills,a.target);
        else if(a.metric==='coins'){g.stats.goldEarned=Math.max(g.stats.goldEarned,a.target);g.gold=Math.max(g.gold,a.target);}
        else if(a.metric==='level')g.level=Math.max(g.level,a.target);
        else if(a.metric==='power')r.peakPower=Math.max(r.peakPower,a.target);
        else if(H.ids.includes(a.metric)){g.level=Math.max(50,g.level);g.has_haki_unlocked=true;g.haki.unlocked=true;for(const id of H.ids)Object.assign(g,A.record(g,'hakiUnlocked',id));}
        else if(a.metric==='islands')r.islands=A.travelIds.slice(0,a.target);
        else return fail('Esta meta depende de um sistema futuro.');break;
      }
      case 'prison-preview':if(!number(command.floor,0,100))return fail('Andar inválido.');g.impelDown.cleared=command.floor;break;
      case 'option':if(!['godMode','infiniteWill','noCooldown'].includes(command.name))return fail('Opção inválida.');g.devOptions={...g.devOptions,[command.name]:command.enabled===true};break;
      case 'restore':case 'low-hp':case 'cooldowns':break;
      default:return fail('Comando dev desconhecido.');
    }
    const next=H.migrate(T.migrate(C.migrate(g)));next.devSandbox=true;
    return {ok:true,state:next,message:'Comando aplicado somente ao save de teste.'};
  }
  function render({g,on,classes,defs,E,status='',review=null}){
    if(!on)return `<section class="dev-tools"><h2>Laboratório temporário</h2><p>Teste sem esperar subir de nível. O laboratório usa uma cópia separada do personagem; seu progresso normal continua no save original.</p><p>Comandos: níveis, sete classes, talentos finais, conquistas, Haki, itens, forja e encontros de combate. Não libera modos ainda em desenvolvimento.</p><button class="dialog-button" data-dev-enter>Abrir laboratório</button><p>Também acessível por F8. Funciona no computador e no celular.</p></section>`;
    const T=root.MareTalents,tree=T.getTree(g.classId),button=(type,label,extra='')=>`<button type="button" data-dev-command="${type}" ${extra}>${label}</button>`;
    const achievements=root.MareAchievements.list(g).filter(a=>a.enabled&&['kills','coins','level','power','islands','armament','observation','conqueror'].includes(a.metric));
    return `<section class="dev-tools"><header><div><h2>Laboratório isolado</h2><p>Nv.${g.level} · ${E(classes[g.classId].name)} · ${T.available(g)} PT disponíveis</p></div><button type="button" class="dialog-button secondary" data-dev-exit>Voltar ao jogo normal</button></header><p class="dev-notice">Save de teste separado. Nenhum item, nível ou conquista daqui será transferido para a aventura normal.</p><p role="status" class="dev-result">${E(status)}</p><div class="dev-grid">
      <section><h3>Paper Doll · Personagem único</h3><a class="dialog-button" href="?dev=1&amp;paperDollReview=complete">Testar as sete classes</a><p>Pacote unificado: troque a classe abaixo e prepare os equipamentos na tela de aparência.</p><button type="button" data-dev-go="appearance">Preparar aparência e equipamentos</button><p>Mesmo corpo, cabelo e roupa para todas as classes e facções. Para testar repouso e caminhada, escolha a classe abaixo e remova a arma no inventário. O Espadachim também tem a espada inicial compatível. Movimentos e peças sem conjunto compatível usam o sprite original.</p>${review?.enabled?`<p role="status">${E(review.message||'Carregando peças…')}</p><a class="dialog-button" href="?dev=1">Desativar prévia visual</a>`:`<a class="dialog-button" href="?dev=1&amp;paperDollReview=navy-starter">Testar conjunto azul no jogo</a>`}<p>Somente no laboratório. A aparência não é gravada no save.</p><a class="dialog-button" href="?dev=1&amp;paperDollReview=unarmed">Testar socos modulares</a><p>Ensaio do Lutador: selecione a classe e remova arma, botas e outras peças sem arte. Vá a uma caçada para testar os socos. Direções incompletas preservam o personagem original.</p><a class="dialog-button" href="?dev=1&amp;paperDollReview=gunner">Testar Atirador modular</a><p>Selecione Atirador, equipe o Mosquete de Convés e remova botas ou peças sem arte modular. Prévia visual isolada do save normal.</p><a class="dialog-button" href="?dev=1&amp;paperDollReview=rogue">Testar Gatuno modular</a><p>Selecione Gatuno, equipe as Adagas da Bruma e remova botas ou peças sem arte modular. Corpo e roupa compartilhados; save normal preservado.</p><a href="tools/paper-doll-inspector/index.html?pack=navy-starter">Abrir bancada de peças</a></section>
      <section><h3>Personagem e níveis</h3><label>Nível (1–200)<input id="devLevel" type="number" min="1" max="200" value="${g.level}"></label>${button('level','Aplicar nível')}<div class="dev-presets">${[1,49,50,80,100,200].map(n=>button('level','Nv.'+n,`data-value="${n}"`)).join('')}</div><label>Classe<select id="devClass">${Object.entries(classes).map(([id,c])=>`<option value="${id}" ${id===g.classId?'selected':''}>${E(c.name)}</option>`).join('')}</select></label>${button('class','Trocar classe e arma')}${button('attributes-reset','Devolver atributos')}${button('supplies','+1 milhão dobrões · +10 mil materiais · +100 poções')}</section>
      <section><h3>Despertar e combate</h3>${button('haki-kit','Nv.50 + Livro da Vontade')}${button('haki-unlock','Despertar os três Hakis')}${button('haki-lock','Voltar ao Haki bloqueado')}<div class="dev-presets">${[0,25,50,100].map(n=>button('will',n+' Vontade',`data-value="${n}"`)).join('')}</div>${button('restore','Restaurar Vida, Energia e Vontade')}${button('low-hp','Deixar Vida em 20%')}${button('cooldowns','Limpar recargas')}${['godMode','infiniteWill','noCooldown'].map((id,i)=>`<label class="dev-switch"><input type="checkbox" role="switch" data-dev-option="${id}" ${g.devOptions?.[id]?'checked':''}>${['Invencível','Vontade infinita','Sem recargas'][i]}</label>`).join('')}<small>Desative Invencível para testar efeitos defensivos. Desative Vontade infinita para testar drenagem.</small></section>
      <section><h3>Talentos e conquistas</h3><label>Intermediário<select id="devKeystone">${tree.keystones.map(k=>`<option value="${k.id}">${E(k.name)}</option>`).join('')}</select></label><label>Final<select id="devUltimate"><option value="">Sem final</option>${tree.ultimates.map(k=>`<option value="${k.id}">${E(k.name)}</option>`).join('')}</select></label>${button('build','Preparar build (mín. Nv.80)')}<small>50 PT no primeiro ramo + intermediário + final escolhido. As regras normais continuam válidas.</small>${button('talents-reset','Devolver talentos desta classe')}<label>Meta para simular<select id="devAchievement">${achievements.map(a=>`<option value="${a.id}">${E(a.name)} · +${a.points} PT</option>`).join('')}</select></label>${button('achievement','Preparar meta de conquista')}<button type="button" data-dev-go="achievements">Abrir Conquistas para resgatar</button><button type="button" data-dev-go="talents">Abrir Árvore de Talentos</button></section>
      <section><h3>Itens, caixas e forja</h3><label>Item<select id="devItem">${defs.map((d,i)=>`<option value="${i}">${E(d.name)}</option>`).join('')}</select></label><div class="dev-fields"><label>Quantidade<input id="devCount" type="number" min="1" max="25" value="1"></label><label>Nível do equipamento<input id="devItemLevel" type="number" min="1" max="100" value="1"></label><label>Refino<input id="devPlus" type="number" min="0" max="20" value="0"></label></div><label>Raridade de equipamento<select id="devRarity">${Object.entries(root.MareForge.rarity).map(([id,r])=>`<option value="${id}">${E(r.name)}</option>`).join('')}</select></label>${button('item','Adicionar à mochila')}<small>Quantidade máxima 25; limites da mochila preservados. Pérolas/caixas/livro mantêm seu próprio tipo e nível.</small><button type="button" data-panel="inventory">Abrir Inventário</button><button type="button" data-panel="forge">Abrir Forja</button></section>
      <section><h3>Mapas e inimigos</h3><button type="button" data-dev-travel="beach">Viajar para Ilha Dawn</button><button type="button" data-dev-travel="swamp">Viajar para Cidade das Conchas</button><button type="button" data-dev-travel="orange">Viajar para Orange Town (Nv.11+)</button><button type="button" data-dev-travel="rare">Viajar para Ilha dos Animais Raros (Nv.16+)</button><button type="button" data-dev-travel="syrup">Viajar para Vila Syrup (Nv.21+)</button><button type="button" data-dev-travel="baratie">Viajar para Baratie (Nv.26+)</button><button type="button" data-dev-travel="arlong">Viajar para Parque Arlong (Nv.31+)</button><button type="button" data-dev-travel="lobby">Voltar ao porto</button><button type="button" data-dev-spawn="bandit">Criar monstro comum próximo</button><button type="button" data-dev-spawn="cocox">Criar Cocox próximo</button><button type="button" data-dev-spawn="boss">Criar chefe próximo</button><button type="button" data-dev-clear>Limpar inimigos e pausar caçada</button><small>Criação somente em expedições, com terreno e caminho válidos.</small><label>Prévia da prisão: andares concluídos<input id="devFloor" type="number" min="0" max="100" value="${g.impelDown.cleared}"></label>${button('prison-preview','Liberar inspeção dos andares')}<small>Impel Down continua Em breve: este comando só altera a prévia.</small></section>
      <section><h3>Sessão de teste</h3><button type="button" data-dev-go="haki">Abrir HAKI</button><button type="button" data-dev-close>Fechar e testar no mapa</button><button type="button" data-dev-recopy>Recriar cópia do save normal</button><p>O laboratório é retomado ao recarregar. Sair não apaga o save de teste. Recriar a cópia substitui apenas o laboratório.</p><small>Este é um recurso temporário de desenvolvimento.</small></section>
    </div></section>`;
  }
  const api={ENABLED,NORMAL_KEY,DEV_KEY,active,key,copy,seed,boot,targetURL,canImport,execute,render};root.MareDev=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
