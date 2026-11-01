'use strict';
((root)=>{
  let detach=()=>{};
  const views=new Map(),WIDTH=720,HEIGHT=1320,ICON_SIZE=96,MIN_ZOOM=.58,MAX_ZOOM=1.8;
  const clampZoom=s=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(s)?s:1));
  const iconPaths={blade:'M8 32 30 8l4 4L12 36m-5-8 9 9M6 37l5-5',heart:'M21 36S5 25 5 15C5 4 18 3 21 12 25 3 37 4 37 15c0 10-16 21-16 21Z',shield:'M21 4 36 10v12c0 9-15 16-15 16S6 31 6 22V10Z M21 12v17m-7-9h14',star:'m21 3 5 12 13 1-10 9 3 14-11-7-11 7 3-14L3 16l13-1Z',flame:'M24 3c5 13-10 12-5 22 3-1 5-5 5-8 13 11 10 22-3 22C4 39 2 22 13 13c-1 9 2 10 2 10S12 9 24 3Z',anchor:'M21 12v25M10 18h22M5 26c0 15 32 15 32 0M5 26l-2 7m2-7 7 3m25-3 2 7m-2-7-7 3M21 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',eye:'M3 21s8-13 18-13 18 13 18 13-8 13-18 13S3 21 3 21Zm18-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z'};
  const glyph=(id)=>`<svg viewBox="0 0 42 42" aria-hidden="true"><path d="${iconPaths[id]||iconPaths.star}"/></svg>`;
  function layout(tree){
    const positions={root:{x:360,y:1190},bridgeStart:{x:360,y:805},bridgeEnd:{x:360,y:625},finalGate:{x:360,y:150}};
    tree.branches.forEach((b,i)=>b.nodes.forEach((n,t)=>positions[n.id]={x:[150,360,570][i]+(t%2?(i-1)*20:0),y:[1040,875,550,390,225][t]}));
    tree.keystones.forEach((n,i)=>positions[n.id]={x:[150,360,570][i],y:715});
    tree.ultimates.forEach((n,i)=>positions[n.id]={x:[140,360,580][i],y:55});return positions;
  }

  // Class-specific templates preserve canonical talent IDs and saved investments.
  const iconFor=stat=>/HP|hpPct|healing|health|lifesteal/.test(stat)?'heart':/def|mitig|shield/.test(stat)?'shield':/moveSpeed|evasion|speed/.test(stat)?'boots':/crit|accuracy|range/.test(stat)?'eye':/element|magic|energy|Energy|aoe/.test(stat)?'flame':/rare/.test(stat)?'fruit':'sword';
  const iconPath=id=>'assets/ui/talents/cutouts/talent_'+id+'.png';
  const specialIconPath=id=>'assets/ui/talents/special/'+id+'.png';
  const TALENT_TREE_CONFIG=Object.fromEntries(Object.entries(root.MareTalents.trees).map(([id,tree])=>{
    const p=layout(tree);
    return [id,{classId:id,nodes:[
      ...tree.branches.flatMap(b=>b.nodes.map(n=>({...n,type:n.stat,kind:'common',icon:iconPath(iconFor(n.stat)),maxLevel:n.maxRank,currentLevel:0,...p[n.id],requires:n.requires.map(r=>({...r})),gates:{keystone:n.tier>=2,branchLimit:2}}))),
      ...tree.keystones.map(n=>({...n,type:'special',kind:'mid',icon:specialIconPath(n.id),maxLevel:1,currentLevel:0,...p[n.id],requires:[],gates:{commonPoints:10,exclusive:'keystone'}})),
      ...tree.ultimates.map(n=>({...n,type:'ultimate',kind:'final',icon:specialIconPath(n.id),maxLevel:1,currentLevel:0,...p[n.id],requires:[],requiresAny:tree.branches.map(b=>({id:b.nodes[4].id,level:5})),gates:{commonPoints:50,keystone:true,exclusive:'ultimate'}}))
    ]}];
  }));
  function configFor(game,draft){
    const T=root.MareTalents,tree=T.getTree(game.classId),config=TALENT_TREE_CONFIG[game.classId],p=layout(tree);
    const nodes=config.nodes.map(n=>{
      const currentLevel=n.kind==='common'?(draft.nodes[n.id]||0):Number(draft[n.kind==='mid'?'keystone':'ultimate']===n.id);
      const dependency=T.eligibility(game,draft,n.id),plan=T.invest(game,draft,n.id),max=currentLevel>=n.maxLevel;
      return {...n,currentLevel,isUnlocked:dependency.ok||max,state:max?'max':dependency.ok?'available':'locked',canInvest:plan.ok,reason:plan.message||'',selected:false};
    });
    const edges=[],rank=id=>draft.nodes[id]||0,link=(from,to,active)=>edges.push({from,to,active,a:p[from],b:p[to]});
    for(const b of tree.branches){
      link('root',b.nodes[0].id,true);
      link(b.nodes[0].id,b.nodes[1].id,rank(b.nodes[0].id)>=5);
      const source=rank(b.nodes[1].id)>0?b.nodes[1].id:rank(b.nodes[0].id)>0?b.nodes[0].id:b.nodes[1].id;
      link(source,'bridgeStart',rank(source)>0&&T.commonSpent(draft)>=10);
      link('bridgeEnd',b.nodes[2].id,!!draft.keystone&&rank(b.nodes[1].id)>=5);
      for(let i=2;i<4;i++)link(b.nodes[i].id,b.nodes[i+1].id,rank(b.nodes[i].id)>=5&&!!draft.keystone);
      link(b.nodes[4].id,'finalGate',rank(b.nodes[4].id)>=5&&T.commonSpent(draft)>=50&&!!draft.keystone);
    }
    const finalReady=T.commonSpent(draft)>=50&&!!draft.keystone&&tree.branches.some(b=>rank(b.nodes[4].id)>=5);
    for(const u of tree.ultimates)link('finalGate',u.id,finalReady&&(!draft.ultimate||draft.ultimate===u.id));
    for(const k of tree.keystones){link('bridgeStart',k.id,T.commonSpent(draft)>=10&&(!draft.keystone||draft.keystone===k.id));link(k.id,'bridgeEnd',draft.keystone===k.id);}
    return {...config,nodes,edges,root:p.root};
  }
  const images=new Map();
  function getImage(path,repaint){
    let entry=images.get(path);
    if(!entry){const image=new Image();entry={image,ready:false,callbacks:new Set()};images.set(path,entry);image.onload=()=>{
      if(typeof document!=='undefined'){const scratch=document.createElement('canvas');scratch.width=image.naturalWidth;scratch.height=image.naturalHeight;const scan=scratch.getContext('2d',{willReadFrequently:true});scan.drawImage(image,0,0);const pixels=scan.getImageData(0,0,scratch.width,scratch.height).data;let x0=scratch.width,y0=scratch.height,x1=-1,y1=-1;for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++)if(pixels[(y*scratch.width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1>=0)image.talentBounds={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
      entry.ready=true;for(const fn of entry.callbacks)fn();entry.callbacks.clear();};image.onerror=()=>{entry.retries=(entry.retries||0)+1;if(entry.retries<=2){image.src=path+(path.includes('?')?'&':'?')+'retry='+entry.retries;}else entry.callbacks.clear();};image.src=path;}
    if(!entry.ready&&repaint)entry.callbacks.add(repaint);
    return entry.ready?entry.image:null;
  }
  function renderTalentTree(ctx,config,offsetX=0,offsetY=0,repaint){
    ctx.save();ctx.translate(offsetX,offsetY);ctx.lineWidth=3;
    for(const edge of config.edges){
      ctx.strokeStyle=edge.active?'#f3ca40':'#1a365d';ctx.shadowBlur=edge.active?10:0;ctx.shadowColor='#f3ca40';
      ctx.beginPath();ctx.moveTo(edge.a.x,edge.a.y);const mid=(edge.a.y+edge.b.y)/2;ctx.bezierCurveTo(edge.a.x,mid,edge.b.x,mid,edge.b.x,edge.b.y);ctx.stroke();
    }
    ctx.shadowBlur=0;
    const drawIcon=(path,x,y,locked)=>{
      const img=getImage(path,repaint);ctx.save();
      ctx.filter=locked?'grayscale(100%) opacity(50%)':'none';
      // Trim transparent margins at draw time so the visible artwork fills 96px.
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      if(img){const b=img.talentBounds||{x:0,y:0,w:img.naturalWidth||img.width,h:img.naturalHeight||img.height},scale=ICON_SIZE/Math.max(b.w,b.h),w=b.w*scale,h=b.h*scale;ctx.drawImage(img,b.x,b.y,b.w,b.h,x-w/2,y-h/2,w,h);}
      else{ctx.strokeStyle='#547887';ctx.beginPath();ctx.arc(x,y,ICON_SIZE/2,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    };
    drawIcon(iconPath('anchor'),config.root.x,config.root.y,false);
    for(const n of config.nodes){
      drawIcon(n.icon,n.x,n.y,n.state==='locked');
      ctx.fillStyle='rgba(4,17,32,.92)';ctx.fillRect(n.x-29,n.y+50,58,20);ctx.strokeStyle=n.state==='locked'?'#365b72':n.state==='max'?'#f3ca40':'#bda15d';ctx.lineWidth=1;ctx.strokeRect(n.x-29,n.y+50,58,20);
      ctx.fillStyle=n.state==='locked'?'#93afc1':n.state==='max'?'#f3ca40':'#fff3cc';ctx.font='bold '+Math.max(14,11/(config.visualScale||1))+'px Arial';ctx.textAlign='center';
      ctx.fillText(n.currentLevel+'/'+n.maxLevel,n.x,n.y+65);
    }
    ctx.restore();
  }
  function hitTest(config,x,y){return config.nodes.find(n=>Math.abs(n.x-x)<=ICON_SIZE/2&&Math.abs(n.y-y)<=ICON_SIZE/2)||null;}

  const classPresentation={
    sword:{icon:'sword',description:'Aprimore suas técnicas com a lâmina e desperte o verdadeiro caminho do espadachim.'},
    brawler:{icon:'star',description:'Transforme disciplina e força bruta em golpes capazes de romper qualquer defesa.'},
    gunner:{icon:'eye',description:'Domine a distância, encontre sua abertura e faça cada disparo contar.'},
    rogue:{icon:'boots',description:'Mova-se entre as brechas da guarda e vença com precisão e agilidade.'},
    cyborg:{icon:'shield',description:'Aprimore sua blindagem e seus sistemas para resistir e dominar a batalha.'},
    strategist:{icon:'flame',description:'Conduza as forças elementais e transforme o campo de batalha a seu favor.'},
    healer:{icon:'heart',description:'Fortaleça sua presença e mantenha acesa a esperança de seus companheiros.'}
  };
  const numeric=n=>Number(n.toFixed(2)).toLocaleString('pt-BR',{maximumFractionDigits:2});
  function bonusText(node,rank){
    const percentage=root.MareTalents.describeNode(node).includes('%');
    return '+'+numeric(node.value*rank*(percentage?100:1))+(percentage?'%':'')+' '+node.name.replace(/ [IVX]+$/,'');
  }
  function detailsFor(game,draft,selected){
    const T=root.MareTalents,tree=T.getTree(game.classId),saved=T.buildFor(game),config=configFor(game,draft);
    const item=config.nodes.find(n=>n.id===selected);if(!item)return null;
    const common=item.kind==='common',rank=common?(draft.nodes[item.id]||0):Number(draft[item.kind==='mid'?'keystone':'ultimate']===item.id);
    const savedRank=common?(saved.nodes[item.id]||0):Number(saved[item.kind==='mid'?'keystone':'ultimate']===item.id);
    const max=rank>=item.maxLevel,plan=T.invest(game,draft,item.id),requirements=[];
    const req=(text,met)=>requirements.push({text,met:!!met});
    if(common){
      if(item.tier===0)req('Conectado ao tronco central.',true);
      for(const r of item.requires){const n=T.nodes(game.classId).find(n=>n.id===r.id);req('Requer '+r.level+' pontos em '+n.name+'.',(draft.nodes[r.id]||0)>=r.level);}
      if(item.tier>=2)req('Exige um exclusivo intermediário.',!!draft.keystone);
      req('No máximo dois ramos com investimentos.',tree.branches[item.branch].nodes.some(n=>(draft.nodes[n.id]||0)>0)||T.branchCount(game.classId,draft)<2);
    }else{
      req('Requer '+(item.kind==='mid'?T.KEYSTONE_GATE:T.ULTIMATE_GATE)+' PT comuns.',T.commonSpent(draft)>=(item.kind==='mid'?T.KEYSTONE_GATE:T.ULTIMATE_GATE));
      if(item.kind==='final'){
        req('Exige um exclusivo intermediário.',!!draft.keystone);
        req('Requer 5 pontos no último tier de um ramo.',tree.branches.some(b=>(draft.nodes[b.nodes.at(-1).id]||0)>=5));
      }
      const chosen=draft[item.kind==='mid'?'keystone':'ultimate'];req('Somente um exclusivo '+(item.kind==='mid'?'intermediário.':'final.'),!chosen||chosen===item.id);
    }
    if(!max)req('Custo: '+(item.kind==='final'?T.ULTIMATE_COST:1)+' PT.',T.totalEarned(game)-T.spent(draft)>=(item.kind==='final'?T.ULTIMATE_COST:1));
    return {item,rank,savedRank,max,plan,requirements,changed:rank!==savedRank,branch:common?tree.branches[item.branch].name:'Especialização '+(item.kind==='mid'?'intermediária':'final'),tier:common?'Tier '+(item.tier+1):item.kind==='mid'?'Intermediário':'Final',bonus:common?bonusText(item,rank):rank?'Passiva ativa':'Não adquirido',savedBonus:common?bonusText(item,savedRank):savedRank?'Passiva ativa':'Não adquirido',nextBonus:common?bonusText(item,Math.min(item.maxLevel,rank+1)):item.description,description:common?'Aprimora '+item.name.replace(/ [IVX]+$/,'').toLowerCase()+' no combate.':item.description};
  }
  function inspectorHTML(model,E){
    if(!model)return '<div class="talent-empty-detail"><img src="'+iconPath('anchor')+'" alt=""><h3>Trace seu caminho</h3><p>Selecione um talento para ver seu bônus total, níveis e requisitos.</p><small>Clique para investir. Shift + clique apenas inspeciona.</small></div>';
    const m=model,n=m.item;
    return `<div class="talent-detail-title"><canvas class="talent-detail-medallion" data-talent-medallion="${n.icon}" width="256" height="256" role="img" aria-label="Ícone de ${E(n.name)}"></canvas><div><h3>${E(n.name)}</h3><div class="talent-detail-tags"><span>${E(m.branch)}</span><b>${m.tier}</b></div></div></div>
      <p class="talent-detail-description">${E(m.description)}</p>
      <section class="talent-total-bonus"><h4>${m.changed?'Bônus total na prévia':'Bônus atual total'}</h4><strong data-talent-bonus>${E(m.bonus)}</strong>${n.kind!=='common'&&m.rank?`<p>${E(n.description)}</p>`:''}<small>${m.changed?'Confirme para aplicar. Confirmado: '+E(m.savedBonus)+'.':'Este é o bônus total deste talento no nível atual.'}</small></section>
      <div class="talent-detail-levels"><section><h4>Nível atual</h4><strong data-talent-current-rank>${m.savedRank}/${n.maxLevel}</strong><small>${m.changed?'Prévia: '+m.rank+'/'+n.maxLevel:m.max?'Máximo':'Confirmado'}</small></section><section><h4>Próximo nível</h4>${m.max?'<p>Nível máximo alcançado.</p>':`<strong>${Math.min(n.maxLevel,m.rank+1)}/${n.maxLevel}</strong><small>${E(m.nextBonus)}</small>`}</section></div>
      <section class="talent-requirements"><h4>Requisitos</h4><ul>${m.requirements.map(r=>`<li class="${r.met?'is-met':'is-missing'}"><span aria-hidden="true">${r.met?'✓':'•'}</span><span>${E(r.text)}</span><small>${r.met?'Atendido':'Pendente'}</small></li>`).join('')}</ul></section>
      <button type="button" class="dialog-button talent-invest-button" data-talent-add="${n.id}" ${!m.plan.ok?'disabled':''}>${m.max?'NÍVEL MÁXIMO':n.kind==='common'?'+1 PT NA PRÉVIA':'ESCOLHER NA PRÉVIA'}</button>
      ${!m.plan.ok&&!m.max?`<p class="talent-reason">${E(m.plan.message)}</p>`:''}
      <details class="talent-secondary-details"><summary>Detalhes do efeito</summary><p>${E(n.kind==='common'?root.MareTalents.describeNode(n):n.description)}</p></details>`;
  }

  let renderedConfig=null;
  function render({game,draft,selected,message,escapeHTML:E,canReset}){
    const T=root.MareTalents,tree=T.getTree(game.classId),saved=T.buildFor(game),available=T.totalEarned(game)-T.spent(draft),pending=T.spent(draft)-T.spent(saved),all=T.nodes(game.classId),positions=layout(tree);
    const node=all.find(n=>n.id===selected),exclusive=tree.keystones.find(k=>k.id===selected),ultimate=tree.ultimates.find(k=>k.id===selected),item=node||exclusive||ultimate;
    const plan=item?T.invest(game,draft,item.id):null,rank=node?(draft.nodes[node.id]||0):0;
    const trained=id=>id==='root'||(draft.nodes[id]||0)>0||draft.keystone===id||draft.ultimate===id;
    const config=configFor(game,draft);config.nodes.forEach(n=>n.selected=n.id===selected);renderedConfig=config;
    const button=(n,kind)=>{const p=positions[n.id],active=trained(n.id),visual=config.nodes.find(v=>v.id===n.id),allowed=visual.isUnlocked,normal=kind==='common';return `<button type="button" style="left:${p.x}px;top:${p.y}px" data-node-x="${p.x}" data-node-y="${p.y}" data-talent-select="${n.id}" class="constellation-node ${normal?'talent-node':kind==='final'?'talent-ultimate':'talent-keystone'} ${active?'is-trained is-chosen':''} ${allowed?'is-available':'is-locked'} ${visual.state==='max'?'is-max':''} ${selected===n.id?'is-selected':''}" data-node-state="${visual.state}" aria-pressed="${selected===n.id}" aria-label="${E(n.name)}. ${normal?(draft.nodes[n.id]||0)+' de 10 pontos':active?'Escolhido':kind==='final'?'Final, 3 PT':'Intermediário, 1 PT'}"><span class="node-disc" aria-hidden="true"></span><strong class="node-label">${E(n.name)}</strong></button>`;};

    const identity=classPresentation[game.classId],model=detailsFor(game,draft,selected);
    return `<section class="talent-window constellation-window talent-hd-window ${selected?'has-selection':''}">
      <header class="talent-heading"><div class="talent-budget"><img src="assets/ui/contracts-hd/monthly.png" alt=""><div><strong data-talent-points>${available} PT</strong><span>${T.branchCount(game.classId,draft)}/2 ramos · ${pending} PT na prévia</span><small>${game.level} de níveis + ${root.MareAchievements.bonus(game)} de conquistas</small></div></div></header>
      <div class="talent-workspace constellation-workspace">
      <aside class="talent-class-panel"><canvas class="talent-class-medallion" data-talent-medallion="${iconPath(identity.icon)}" width="512" height="512" role="img" aria-label="Emblema de ${E(tree.name)}"></canvas><h2>${E(tree.name)}</h2><div class="talent-class-rule" aria-hidden="true">◆</div><p>${E(identity.description)}</p></aside>
      <section class="talent-tree-panel"><div class="constellation-toolbar"><span>Árvore da classe ${root.MareCharacterStudio?.help('Árvore de talentos','Clique para investir. Shift + clique apenas inspeciona. Arraste para percorrer a árvore; use a roda, os botões ou pinça para ampliar. O zoom mínimo é 58%. A prévia só afeta o combate após confirmar.')||''}</span><div><button type="button" data-tree-zoom="out" aria-label="Diminuir zoom">−</button><output data-tree-scale>100%</output><button type="button" data-tree-zoom="in" aria-label="Aumentar zoom">+</button><button type="button" data-tree-zoom="actual">96 px</button><button type="button" data-tree-zoom="fit">Visão geral</button><button type="button" data-tree-zoom="root">Tronco</button></div></div>
      <div class="constellation-viewport" data-tree-class="${game.classId}" tabindex="0" aria-label="Árvore interativa. Arraste, use zoom ou navegue nos talentos com Tab."><div class="constellation-canvas" style="width:${WIDTH}px;height:${HEIGHT}px"><canvas class="talent-tree-surface" width="${WIDTH}" height="${HEIGHT}" aria-hidden="true"></canvas><div class="constellation-root" style="left:${positions.root.x}px;top:${positions.root.y}px"><strong>Tronco central</strong><small>Fundação inata · Nível 1</small></div>${all.map(n=>button(n,'common')).join('')}${tree.keystones.map(n=>button(n,'mid')).join('')}${tree.ultimates.map(n=>button(n,'final')).join('')}</div></div></section>
      <aside class="talent-inspector">${inspectorHTML(model,E)}<p class="talent-message" role="status">${E(message||'Confirme a prévia para aplicar os bônus.')}</p>${game.classId==='healer'?'<small class="talent-solo-note">Efeitos de grupo aguardam aliados reais.</small>':''}</aside></div>
      <footer class="talent-actions"><span>${T.spent(saved)} PT confirmados · ${pending} por confirmar</span><button type="button" class="dialog-button secondary" data-talent-cancel>DESCARTAR PRÉVIA</button><button type="button" class="dialog-button" data-talent-confirm ${pending<=0?'disabled':''}>✓ CONFIRMAR TALENTOS</button><button type="button" class="talent-reset" data-talent-reset ${!canReset||T.spent(saved)===0?'disabled':''}>Redefinir no porto</button></footer></section>`;
  }

  function mount(body){
    detach();const vp=body.querySelector('.constellation-viewport');if(!vp)return;
    const heading=body.querySelector('.talent-heading'),header=body.closest('.dialog')?.querySelector('.dialog-header');if(heading&&header)header.insertBefore(heading,header.querySelector('#closePanel'));const canvas=vp.querySelector('.constellation-canvas'),id=vp.dataset.treeClass,w=vp.clientWidth,h=vp.clientHeight;
    const surface=canvas.querySelector('.talent-tree-surface'),config=renderedConfig;
    let alive=true;const paintMedallions=()=>{if(!alive)return;for(const target of body.querySelectorAll('canvas[data-talent-medallion]')){const img=getImage(target.dataset.talentMedallion,paintMedallions);if(!img)continue;const c=target.getContext('2d'),b=img.talentBounds||{x:0,y:0,w:img.naturalWidth,h:img.naturalHeight},fit=Math.min(target.width,target.height)-16,k=fit/Math.max(b.w,b.h),w=b.w*k,h=b.h*k;c.clearRect(0,0,target.width,target.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(img,b.x,b.y,b.w,b.h,(target.width-w)/2,(target.height-h)/2,w,h);}};paintMedallions();const repaint=()=>{if(!alive||!surface.isConnected)return;const ctx=surface.getContext('2d');ctx.clearRect(0,0,WIDTH,HEIGHT);renderTalentTree(ctx,config,0,0,repaint);surface.dataset.litEdges=config.edges.filter(e=>e.active).length;surface.dataset.edgeCount=config.edges.length;surface.dataset.iconsReady=config.nodes.every(n=>images.get(n.icon)?.ready);};repaint();
    let view=views.get(id);if(!view){const s=clampZoom(Math.min(.75,w/WIDTH*.96));view={s,x:(w-WIDTH*s)/2,y:h-HEIGHT*s,w,h,anchor:'root'};views.set(id,view);}else{view.x+=(w-view.w)/2;view.y+=(h-view.h)/2;view.w=w;view.h=h;}
    view.s=clampZoom(view.s);
    let density=0;const bound=()=>{const cw=WIDTH*view.s,ch=HEIGHT*view.s,vw=vp.clientWidth,vh=vp.clientHeight;view.x=cw<=vw?(vw-cw)/2:Math.max(vw-cw,Math.min(0,view.x));view.y=ch<=vh?(vh-ch)/2:Math.max(vh-ch,Math.min(0,view.y));};const paint=()=>{bound();const next=Math.min(3,(window.devicePixelRatio||1)*Math.max(1,view.s));if(next!==density){density=next;surface.width=Math.round(WIDTH*density);surface.height=Math.round(HEIGHT*density);surface.getContext('2d').setTransform(density,0,0,density,0,0);repaint();}canvas.style.setProperty('--talent-view-scale',view.s);if(config.visualScale!==view.s){config.visualScale=view.s;repaint();}canvas.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.s})`;const label=body.querySelector('[data-tree-scale]');if(label)label.textContent=Math.round(view.s*100)+'%';const out=body.querySelector('[data-tree-zoom=out]'),inside=body.querySelector('[data-tree-zoom=in]');if(out)out.disabled=view.s<=MIN_ZOOM;if(inside)inside.disabled=view.s>=MAX_ZOOM;};
    const zoom=(s,cx=vp.clientWidth/2,cy=vp.clientHeight/2)=>{view.anchor=null;s=clampZoom(s);const ratio=s/view.s;view.x=cx-(cx-view.x)*ratio;view.y=cy-(cy-view.y)*ratio;view.s=s;paint();};
    body.querySelectorAll('[data-tree-zoom]').forEach(b=>b.onclick=()=>{const a=b.dataset.treeZoom;if(a==='actual'){zoom(1);}else if(a==='fit'){view.s=clampZoom(Math.min(vp.clientWidth/WIDTH,vp.clientHeight/HEIGHT)*.95);view.x=(vp.clientWidth-WIDTH*view.s)/2;view.y=(vp.clientHeight-HEIGHT*view.s)/2;paint();}else if(a==='root'){view.anchor='root';view.s=clampZoom(Math.min(.75,vp.clientWidth/WIDTH*.96));view.x=vp.clientWidth/2-WIDTH/2*view.s;view.y=vp.clientHeight-HEIGHT*view.s;paint();}else zoom(view.s*(a==='in'?1.2:1/1.2));});
    vp.addEventListener('wheel',e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoom(view.s*(e.deltaY<0?1.12:1/1.12),e.clientX-r.left,e.clientY-r.top);},{passive:false});
    const pointers=new Map();let prior=null,pinch=0,dragged=false;
    vp.addEventListener('pointerdown',e=>{if(e.button&&e.pointerType==='mouse')return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});prior={x:e.clientX,y:e.clientY};dragged=false;if(!e.target.closest('button')||pointers.size>1)vp.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
    vp.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],next=Math.hypot(a.x-b.x,a.y-b.y),r=vp.getBoundingClientRect();if(pinch)zoom(view.s*next/pinch,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch=next;dragged=true;}else if(prior){const dx=e.clientX-prior.x,dy=e.clientY-prior.y;if(dragged||Math.abs(dx)+Math.abs(dy)>3){dragged=true;view.anchor=null;view.x+=dx;view.y+=dy;prior={x:e.clientX,y:e.clientY};paint();}}});
    const end=e=>{pointers.delete(e.pointerId);prior=null;pinch=0;};vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);
    vp.addEventListener('click',e=>{if(dragged&&e.detail){e.preventDefault();e.stopPropagation();}},{capture:true});
    vp.addEventListener('click',e=>{if(e.target.closest('[data-talent-select]')||dragged)return;const r=vp.getBoundingClientRect(),node=hitTest(config,(e.clientX-r.left-view.x)/view.s,(e.clientY-r.top-view.y)/view.s);if(node)vp.querySelector('[data-talent-select="'+node.id+'"]')?.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:e.shiftKey}));});
    const revealFocused=n=>{if(!n||!vp.contains(n))return;const x=Number(n.dataset.nodeX)*view.s+view.x,y=Number(n.dataset.nodeY)*view.s+view.y;const margin=55*view.s+2;if(x<margin||x>vp.clientWidth-margin||y<margin||y>vp.clientHeight-95*view.s){view.anchor=null;view.x=vp.clientWidth/2-Number(n.dataset.nodeX)*view.s;view.y=vp.clientHeight/2-Number(n.dataset.nodeY)*view.s;paint();}};vp.addEventListener('focusin',e=>revealFocused(e.target.closest('[data-node-x]')));
    vp.addEventListener('keydown',e=>{if(e.target!==vp)return;if(['+','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='+')zoom(view.s*1.2);else if(e.key==='-')zoom(view.s/1.2);else{view.x+=e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0;view.y+=e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0;paint();}}});paint();
    const observer=new ResizeObserver(()=>{if(!vp.isConnected){observer.disconnect();return;}const nw=vp.clientWidth,nh=vp.clientHeight;if(view.anchor==='root'){view.x=(nw-WIDTH*view.s)/2;view.y=nh-HEIGHT*view.s;}else{view.x+=(nw-view.w)/2;view.y+=(nh-view.h)/2;}view.w=nw;view.h=nh;paint();revealFocused(document.activeElement?.closest('[data-node-x]'));});observer.observe(vp);detach=()=>{alive=false;heading?.remove();observer.disconnect();for(const entry of images.values()){entry.callbacks.delete(repaint);entry.callbacks.delete(paintMedallions);}};
  }
  const number=n=>Number(n).toLocaleString('pt-BR');
  function renderAchievements(options){return root.MareAchievementUI.render(options);}
  function refreshAchievements(body,game,message){root.MareAchievementUI.refresh(body,game,message);}
  const api={WIDTH,HEIGHT,detailsFor,bonusText,ICON_SIZE,MIN_ZOOM,MAX_ZOOM,clampZoom,unmount:()=>detach(),render,mount,layout,TALENT_TREE_CONFIG,configFor,renderTalentTree,hitTest,renderAchievements,refreshAchievements};
  root.MareTalentUI=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
