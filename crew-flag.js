(function(root){
  'use strict';

  const SIZE=32;
  const PALETTE=[null,'#11151c','#f6ebcc','#b52d38','#e98030','#f4ca50','#47865d','#45a6ce','#2453a2','#674b95','#a8acb5','#845334','#4c2e2b','#df9aaa','#f4f7f8','#dbc485'];
  const NAMES=['Transparente','Carvão','Marfim','Carmim','Laranja','Ouro','Verde','Celeste','Azul','Violeta','Prata','Marrom','Madeira escura','Rosa','Branco','Areia'];
  const empty='0'.repeat(SIZE*SIZE);
  const flagPattern=/^[0-9a-f]{1024}$/;
  const cache=new Map();

  function decode(value){
    return Uint8Array.from(flagPattern.test(value)?value:empty,digit=>parseInt(digit,16));
  }
  function encode(pixels){return Array.from(pixels,digit=>digit.toString(16)).join('');}
  function draw(canvas,pixels){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,SIZE,SIZE);
    pixels.forEach((color,index)=>{
      if(!color)return;
      ctx.fillStyle=PALETTE[color];
      ctx.fillRect(index%SIZE,Math.floor(index/SIZE),1,1);
    });
  }
  function dataUrl(value){
    if(typeof value!=='string'||!flagPattern.test(value)||value===empty||!root.document)return '';
    if(cache.has(value))return cache.get(value);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=SIZE;
    draw(canvas,decode(value));
    const url=canvas.toDataURL('image/png');
    if(cache.size>=128)cache.delete(cache.keys().next().value);
    cache.set(value,url);
    return url;
  }
  function fill(pixels,index,color){
    const replaced=pixels[index];
    if(replaced===color)return;
    const queue=[index];
    pixels[index]=color;
    for(let i=0;i<queue.length;i++){
      const at=queue[i],x=at%SIZE;
      const neighbors=[x>0?at-1:-1,x<SIZE-1?at+1:-1,at-SIZE,at+SIZE];
      for(const next of neighbors){
        if(next>=0&&next<pixels.length&&pixels[next]===replaced){
          pixels[next]=color;
          queue.push(next);
        }
      }
    }
  }
  function line(pixels,from,to,color){
    let x=from%SIZE,y=Math.floor(from/SIZE);
    const tx=to%SIZE,ty=Math.floor(to/SIZE),dx=Math.abs(tx-x),dy=-Math.abs(ty-y);
    const sx=x<tx?1:-1,sy=y<ty?1:-1;
    let error=dx+dy;
    while(true){
      pixels[y*SIZE+x]=color;
      if(x===tx&&y===ty)break;
      const twice=2*error;
      if(twice>=dy){error+=dy;x+=sx;}
      if(twice<=dx){error+=dx;y+=sy;}
    }
  }

  function create(value=empty){
    let pixels=decode(value),color=5,tool='pencil',cursor=SIZE*16+16,activePointer=null,previous=null,stroke=null;
    const undo=[],redo=[];
    const markup='<section class="crew-flag-editor" aria-label="Editor de bandeira"><h3>Desenhe seu Jolly Roger</h3><div class="crew-editor-main"><div class="crew-flag-grid"><canvas width="32" height="32" tabindex="0" aria-label="Grade de desenho da bandeira" aria-describedby="crew-flag-help" data-crew-draw></canvas><i aria-hidden="true" data-crew-cursor></i></div><div class="crew-editor-side"><div class="crew-edit-buttons" role="group" aria-label="Ferramentas"><button type="button" data-crew-tool="pencil">Lápis</button><button type="button" data-crew-tool="eraser">Borracha</button><button type="button" data-crew-tool="fill">Preencher</button></div><div class="crew-palette" role="group" aria-label="Paleta de cores">'+PALETTE.slice(1).map((hex,i)=>'<button type="button" data-crew-color="'+(i+1)+'" aria-label="'+NAMES[i+1]+'" title="'+NAMES[i+1]+'" style="--ink:'+hex+'"></button>').join('')+'</div><div class="crew-edit-buttons" role="group" aria-label="Histórico do desenho"><button type="button" data-crew-history="undo">Desfazer</button><button type="button" data-crew-history="redo">Refazer</button><button type="button" data-crew-history="clear">Limpar</button></div><figure class="crew-flag-preview"><canvas width="32" height="32" data-crew-flag-preview aria-label="Prévia da bandeira"></canvas><figcaption>Prévia em miniatura</figcaption></figure></div></div><small id="crew-flag-help">Arraste para desenhar. No teclado, mova com as setas e aplique com Espaço.</small><span class="crew-visually-hidden" role="status" data-crew-coordinate></span></section>';

    function remember(snapshot){
      if(snapshot.every((v,i)=>v===pixels[i]))return;
      undo.push(snapshot);
      if(undo.length>64)undo.shift();
      redo.length=0;
    }

    function mount(container,onChange){
      const panel=container.querySelector('.crew-flag-editor');
      if(!panel)return;
      const canvas=panel.querySelector('[data-crew-draw]'),preview=panel.querySelector('[data-crew-flag-preview]');
      const marker=panel.querySelector('[data-crew-cursor]'),coordinate=panel.querySelector('[data-crew-coordinate]');
      function update(notify=false){
        draw(canvas,pixels);
        draw(preview,pixels);
        marker.style.setProperty('--cursor-x',cursor%SIZE);
        marker.style.setProperty('--cursor-y',Math.floor(cursor/SIZE));
        for(const button of panel.querySelectorAll('[data-crew-tool]'))button.setAttribute('aria-pressed',String(button.dataset.crewTool===tool));
        for(const button of panel.querySelectorAll('[data-crew-color]'))button.setAttribute('aria-pressed',String(Number(button.dataset.crewColor)===color));
        panel.querySelector('[data-crew-history="undo"]').disabled=!undo.length;
        panel.querySelector('[data-crew-history="redo"]').disabled=!redo.length;
        if(notify)onChange?.(encode(pixels));
      }
      function paint(index,from=index){
        if(tool==='fill')fill(pixels,index,color);
        else line(pixels,from,index,tool==='eraser'?0:color);
      }
      function cell(event){
        const box=canvas.getBoundingClientRect();
        const local=(point,start,span)=>Math.max(0,Math.min(SIZE-1,Math.floor((point-start)*SIZE/span)));
        return local(event.clientY,box.top,box.height)*SIZE+local(event.clientX,box.left,box.width);
      }
      canvas.addEventListener('pointerdown',event=>{
        if(event.button!==0||activePointer!==null)return;
        event.preventDefault();
        canvas.focus({preventScroll:true});
        canvas.setPointerCapture(event.pointerId);
        activePointer=event.pointerId;
        stroke=pixels.slice();
        cursor=previous=cell(event);
        paint(cursor);
        update(true);
      });
      canvas.addEventListener('pointermove',event=>{
        if(activePointer!==event.pointerId||tool==='fill')return;
        cursor=cell(event);
        paint(cursor,previous);
        previous=cursor;
        update(true);
      });
      function finish(event){
        if(activePointer!==event.pointerId)return;
        activePointer=null;
        previous=null;
        remember(stroke);
        stroke=null;
        update(true);
      }
      for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,finish);
      canvas.addEventListener('keydown',event=>{
        const x=cursor%SIZE,y=Math.floor(cursor/SIZE);
        const next={ArrowLeft:x>0?cursor-1:cursor,ArrowRight:x<SIZE-1?cursor+1:cursor,ArrowUp:y>0?cursor-SIZE:cursor,ArrowDown:y<SIZE-1?cursor+SIZE:cursor};
        if(Object.hasOwn(next,event.key)){
          event.preventDefault();
          event.stopPropagation();
          cursor=next[event.key];
          coordinate.textContent='Coluna '+(cursor%SIZE+1)+', linha '+(Math.floor(cursor/SIZE)+1);
          update();
        }else if(event.key===' '||event.key==='Enter'){
          event.preventDefault();
          event.stopPropagation();
          const snapshot=pixels.slice();
          paint(cursor);
          remember(snapshot);
          update(true);
        }
      });
      panel.addEventListener('click',event=>{
        const button=event.target.closest('button');
        if(!button)return;
        const {crewTool,crewColor,crewHistory}=button.dataset;
        if(crewTool)tool=crewTool;
        if(crewColor){color=Number(crewColor);if(tool==='eraser')tool='pencil';}
        if(crewHistory==='undo'&&undo.length){redo.push(pixels.slice());pixels=undo.pop();}
        if(crewHistory==='redo'&&redo.length){undo.push(pixels.slice());pixels=redo.pop();}
        if(crewHistory==='clear'){const snapshot=pixels.slice();pixels.fill(0);remember(snapshot);}
        update(Boolean(crewHistory));
      });
      update();
    }
    return {markup,mount,get value(){return encode(pixels);}};
  }

  root.MareCrewFlag={create,dataUrl,empty,decode,encode,fill,line};
  if(typeof module==='object')module.exports=root.MareCrewFlag;
})(globalThis);
