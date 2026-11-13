/* BFF session for the original game. No demo storage, provider tokens or client rewards. */
(function (root) {
  "use strict";
  const key = "mare-game-pending-v1",
    classes = [
      "sword",
      "brawler",
      "gunner",
      "rogue",
      "cyborg",
      "strategist",
      "healer",
    ];
  const attributes = [
      "strength",
      "dexterity",
      "vitality",
      "intelligence",
      "spirit",
    ],
    items = ["dock-scrap-v1", "training-weapon-v1", "dock-vest-v1"];
  const originalSlots=['head','necklace','coat','legs','boots','weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'];
  const instanceId=v=>typeof v==='string'&&/^[a-zA-Z0-9:-]{1,80}$/.test(v);
  function validForge(op){
    if(!op||typeof op!=='object'||typeof op.type!=='string'||!Number.isSafeInteger(op.expectedSeq)||op.expectedSeq<0)return false;
    const fields={formEpicWeapon:[],upgrade:['itemId'],imbue:['itemId','pearlItemId','socket'],remove:['itemId','socket'],fuse:['itemIds'],fuseEquipment:['itemIds','slot'],reforge:['itemId'],reforgeLine:['itemId','line']}[op.type];
    if(!Array.isArray(fields)||Object.keys(op).sort().join()!==['type','expectedSeq',...fields].sort().join())return false;
    return fields.every(k=>k==='itemIds'?Array.isArray(op[k])&&op[k].length===5&&new Set(op[k]).size===5&&op[k].every(instanceId):k==='slot'?originalSlots.includes(op[k]):k==='socket'||k==='line'?Number.isInteger(op[k])&&op[k]>=0&&op[k]<=(k==='socket'?4:7):instanceId(op[k]));
  }
  function validIntent(action, p) {
    if (!p || typeof p !== "object" || Array.isArray(p)) return false;
    const keys = Object.keys(p).sort().join();
    const socialId=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
    const namedInvite=(keys==='targetId'&&socialId(p.targetId))||(keys==='name'&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=40);
    if(action==='weeklyBoss.execute'){
      const version=v=>Number.isSafeInteger(v)&&v>0;
      if(['test','leave'].includes(p.op))return keys==='op';
      if(p.op==='activate')return keys==='op,revision'&&version(p.revision);
      if(p.op==='join')return keys==='eventId,op'&&socialId(p.eventId);
      if(p.op==='cancel')return keys==='eventId,op,version'&&socialId(p.eventId)&&version(p.version);
      if(p.op==='configure'){
        const c=p.config,q=c?.profile,limits={hp:[1,1e9],attack:[1,1e6],defense:[0,1e6],magicDefense:[0,1e6],speed:[1,240],reach:[24,160],attackSec:[1,30],aoeCooldown:[4,120],aoeRadius:[48,240],aoeWindup:[.8,5],aoeMultiplier:[.1,10],level:[1,1000],leash:[240,1200]},point=v=>v&&Object.keys(v).sort().join()==='x,y'&&[v.x,v.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100000);
        return keys==='config,op,revision'&&version(p.revision)&&c&&Object.keys(c).sort().join()==='balanceApproved,durationMinutes,entry,mapId,maxPlayers,minLevel,profile,spawn'&&c.mapId==='marineford'&&c.balanceApproved===true&&point(c.spawn)&&point(c.entry)&&Number.isInteger(c.maxPlayers)&&c.maxPlayers>=1&&c.maxPlayers<=16&&Number.isInteger(c.minLevel)&&c.minLevel>=1&&c.minLevel<=1000&&Number.isInteger(c.durationMinutes)&&c.durationMinutes>=1&&c.durationMinutes<=180&&q&&Object.keys(q).sort().join()===Object.keys(limits).sort().join()&&Object.entries(limits).every(([k,[lo,hi]])=>Number.isFinite(q[k])&&q[k]>=lo&&q[k]<=hi)&&Number.isInteger(q.hp)&&Number.isInteger(q.level)&&q.leash>=q.aoeRadius+64;
      }return false;
    }
    if(['party.invite','crew.invite','trade.invite'].includes(action))return namedInvite;
    if(['friend.request','friend.remove'].includes(action))return keys==='targetId'&&socialId(p.targetId);
    if(action==='friend.respond')return keys==='accept,requestId'&&socialId(p.requestId)&&typeof p.accept==='boolean';
    if(action==='friend.cancel')return keys==='requestId'&&socialId(p.requestId);
    if(action==='contact.block')return keys==='blocked,targetId'&&socialId(p.targetId)&&typeof p.blocked==='boolean';
    if(action==='message.send')return keys==='body,targetId'&&socialId(p.targetId)&&typeof p.body==='string'&&p.body.trim().length>0&&p.body.trim().length<=500;
    if(action==='message.read')return keys==='targetId,throughId'&&socialId(p.targetId)&&typeof p.throughId==='string'&&/^[1-9][0-9]{0,18}$/.test(p.throughId)&&BigInt(p.throughId)<=9223372036854775807n;
    if(['mail.read','mail.claim','mail.archive'].includes(action))return keys==='mailId'&&socialId(p.mailId);
    if(['mail.claim-all','mail.archive-claimed'].includes(action))return keys==='';
    if(action==='trade.respond')return keys==='accept,tradeId'&&socialId(p.tradeId)&&typeof p.accept==='boolean';
    if(action==='trade.cancel')return keys==='tradeId'&&socialId(p.tradeId);
    if(['trade.offer','trade.lock','trade.confirm'].includes(action)){
      if(!socialId(p.tradeId)||!Number.isSafeInteger(p.expectedOfferVersion)||p.expectedOfferVersion<0)return false;
      if(action==='trade.offer')return keys==='expectedOfferVersion,itemId,quantity,tradeId'&&instanceId(p.itemId)&&Number.isSafeInteger(p.quantity)&&p.quantity>=0&&p.quantity<=99999;
      return action==='trade.lock'?keys==='expectedOfferVersion,locked,tradeId'&&typeof p.locked==='boolean':keys==='expectedOfferVersion,tradeId';
    }
    if(action==='market.execute'){
      const whole=(v,max)=>Number.isSafeInteger(v)&&v>=1&&v<=max;
      const amount=v=>whole(v,1000000000000), version=v=>whole(v,2147483647);
      const has=(name)=>Object.hasOwn(p,name);
      const shape=(required,optional=[])=>required.every(has)&&Object.keys(p).every(name=>required.includes(name)||optional.includes(name));
      if(p.kind==='market_publish'){
        const base=['kind','itemId','quantity','mode','hours'];
        if(!instanceId(p.itemId)||!whole(p.quantity,99999)||![24,48,72].includes(p.hours)||(has('feeBps')&&![1000,1500].includes(p.feeBps)))return false;
        if(p.mode==='direct')return shape([...base,'price'],['feeBps'])&&amount(p.price);
        return p.mode==='auction'&&shape([...base,'minOffer'],['feeBps','buyNow'])&&amount(p.minOffer)&&(!has('buyNow')||amount(p.buyNow)&&p.buyNow>=p.minOffer);
      }
      if(p.kind==='market_collect_all')return keys==='kind';
      if(p.kind==='market_collect')return keys==='kind,saleId'&&socialId(p.saleId);
      if(p.kind==='market_read_notices')return keys==='kind,noticeIds'&&Array.isArray(p.noticeIds)&&p.noticeIds.length>0&&p.noticeIds.length<=50&&p.noticeIds.every(socialId);
      if(!socialId(p.listingId)||!version(p.version))return false;
      const listing=['kind','listingId','version'];
      if(p.kind==='market_cancel')return shape(listing);
      if(p.kind==='market_buy')return shape([...listing,'amount'])&&amount(p.amount);
      if(p.kind==='market_offer')return shape([...listing,'amount'],['proposalId','proposalVersion'])&&amount(p.amount)&&(!has('proposalVersion')||version(p.proposalVersion))&&(!has('proposalId')||socialId(p.proposalId));
      return ['market_withdraw','market_reject','market_accept'].includes(p.kind)&&shape([...listing,'proposalId','proposalVersion'])&&socialId(p.proposalId)&&version(p.proposalVersion);
    }
    if(action.startsWith('crew.')){
      const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
      const whole=(v,max)=>Number.isSafeInteger(v)&&v>=1&&v<=max;
      const policy=['open','approval'].includes(p.policy)&&whole(p.minLevel,1000);
      if(action==='crew.create')return keys==='flag,minLevel,name,policy,tag'&&policy&&typeof p.name==='string'&&p.name.trim().length>=3&&p.name.length<=96&&typeof p.tag==='string'&&/^[a-z0-9]{2,6}$/i.test(p.tag.trim())&&typeof p.flag==='string'&&/^[0-9a-f]{1024}$/.test(p.flag);
      if(action==='crew.join'||action==='crew.apply')return keys==='crewId'&&uuid(p.crewId);
      if(action==='crew.respond')return keys==='accept,requestId'&&uuid(p.requestId)&&typeof p.accept==='boolean';
      if(action==='crew.recruitment')return keys==='minLevel,policy'&&policy;
      if(action==='crew.role')return keys==='memberId,role'&&uuid(p.memberId)&&['officer','member'].includes(p.role);
      if(action==='crew.transfer'||action==='crew.kick')return keys==='memberId'&&uuid(p.memberId);
      if(action==='crew.leave')return keys==='';
      if(action==='crew.dissolve')return keys==='confirmed'&&p.confirmed===true;
      if(action==='crew.donate')return keys==='amount'&&whole(p.amount,Number.MAX_SAFE_INTEGER);
      if(action==='crew.upgrade')return keys==='expectedLevel,facility'&&whole(p.expectedLevel,5)&&['hull','infirmary','galley','command','workshop','navigation','warehouse'].includes(p.facility);
      if(action==='crew.profession')return keys==='profession'&&['doctor','command','cook','carpenter','navigator'].includes(p.profession);
      return false;
    }
    if(action.startsWith('party.')){
      const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
      if(['party.create','party.leave'].includes(action))return keys==='';
      if(action==='party.respond')return keys==='accept,inviteId'&&uuid(p.inviteId)&&typeof p.accept==='boolean';
      if(['party.promote','party.kick'].includes(action))return keys==='memberId'&&uuid(p.memberId);
      if(action==='party.prepare')return keys==='destination,kind'&&['hunt','dungeon'].includes(p.kind)&&typeof p.destination==='string'&&/^[a-z0-9-]{1,40}$/.test(p.destination);
      if(action==='party.ready')return keys==='nonce,ready'&&uuid(p.nonce)&&typeof p.ready==='boolean';
      if(action==='party.start')return keys==='nonce'&&uuid(p.nonce);return false;
    }
    if(action==='profile.appearance'||action==='profile.identity'){
      const a=p.appearance,appearanceOK=a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).sort().join()==='eyeColor,eyeStyle,gender,hairColor,hairStyle,skinColor,skinStyle,version'&&a.version===1&&Object.entries(a).every(([k,v])=>k==='version'||typeof v==='string'&&/^[a-z-]{1,30}$/.test(v));
      return !!appearanceOK&&(action==='profile.appearance'?keys==='appearance':keys==='appearance,classId,factionId,name'&&classes.includes(p.classId)&&['pirate','marine','revolutionary','government'].includes(p.factionId)&&typeof p.name==='string'&&p.name.length>=1&&p.name.length<=40);
    }
    if(action==='profile.preferences')return Object.keys(p).length>0&&Object.entries(p).every(([k,v])=>k==='healThreshold'?Number.isFinite(v)&&v>=.25&&v<=.9:['hideItems','hideHeadgear'].includes(k)&&typeof v==='boolean');
    if(action==='fruit.register')return keys==='itemId'&&typeof p.itemId==='string'&&p.itemId.length>0&&p.itemId.length<=80;
    if(action==='fruit.transform')return keys==='enabled'&&typeof p.enabled==='boolean';
    if(action==='fruit.move')return keys==='x,y'&&['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100000);
    if(action==='fruit.cast')return (keys==='key'||keys==='key,point')&&['1','2','3'].includes(p.key)&&(!p.point||Object.keys(p.point).sort().join(',')==='x,y'&&['x','y'].every(k=>Number.isFinite(p.point[k])&&p.point[k]>=0&&p.point[k]<=100000));
    if(action==='hierarchy.promote')return keys==='expectedTier'&&Number.isInteger(p.expectedTier)&&p.expectedTier>=1&&p.expectedTier<=5;
    if(action==='haki.unlock')return keys==='itemId'&&instanceId(p.itemId);
    if(action==='haki.toggle')return keys==='branch'&&['armament','observation'].includes(p.branch);
    if(action==='haki.configure')return keys==='branch,enabled'&&['armament','observation'].includes(p.branch)&&typeof p.enabled==='boolean';
    if(action==='haki.cast')return keys==='';
    if(action==='haki.invest')return keys==='expectedSeq,nodeId'&&Number.isSafeInteger(p.expectedSeq)&&p.expectedSeq>=0&&['coating','hardening','guard','imbuement','emission','armament-final','perception','anticipation','intent','serenity','future','observation-final','presence','resolve','pressure','conqueror-final'].includes(p.nodeId);
    if(['dungeon.enter','dungeon.claim'].includes(action))return keys==='dungeonId'&&['alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile'].includes(p.dungeonId);
    if(action==='dungeon.craft')return keys==='expectedSeq'&&Number.isSafeInteger(p.expectedSeq)&&p.expectedSeq>=0;
    if(action==='dungeon.acknowledge')return keys==='itemId'&&instanceId(p.itemId);
    if(['prison.prepare','prison.enter','prison.claim'].includes(action))return keys==='floor'&&Number.isInteger(p.floor)&&p.floor>=1&&p.floor<=100;
    if(action==='talents.reset')return keys==='';
    if(action==='talents.commit'){
      const b=p.build;return keys==='build'&&b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).sort().join()==='keystone,nodes,ultimate'&&b.nodes&&typeof b.nodes==='object'&&!Array.isArray(b.nodes)&&Object.keys(b.nodes).length<=15&&Object.entries(b.nodes).every(([id,n])=>/^(sword|brawler|gunner|rogue|cyborg|strategist|healer)-[0-2]-[0-4]$/.test(id)&&Number.isInteger(n)&&n>=0&&n<=10)&&[b.keystone,b.ultimate].every(v=>v===null||typeof v==='string'&&/^[a-zA-Z]{1,32}$/.test(v));
    }
    if(action==='achievement.claim')return keys==='achievementId'&&["kills-0", "kills-1", "kills-2", "kills-3", "floors-0", "floors-1", "floors-2", "floors-3", "coins-0", "coins-1", "coins-2", "level-0", "level-1", "level-2", "level-3", "level-4", "power-0", "power-1", "power-2", "power-3", "power-4", "fruits-0", "fruits-1", "awakenings-0", "observation-0", "armament-0", "conqueror-0", "hakiMastery-0", "islands-0", "fastTravel-0", "bounties-0"].includes(p.achievementId);
    if(action==='contract.claim')return keys==='contractId'&&['crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol','daily-reward'].includes(p.contractId);
    if(['battle.start','battle.first'].includes(action))return keys==='';
    if(action==='battle.auto')return keys==='enabled'&&typeof p.enabled==='boolean';
    if(action==='battle.target')return keys==='targetId'&&(p.targetId===null||typeof p.targetId==='string'&&/^[a-f0-9-]{36}$/.test(p.targetId));
    if(action==='battle.skill')return keys==='index'&&Number.isInteger(p.index)&&p.index>=0&&p.index<=1;
    if(['world.initialize','world.stop','world.return'].includes(action))return keys==='';
    if(action==='world.move')return keys==='x,y'&&['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100000);
    if(action==='world.travel')return keys==='islandId'&&typeof p.islandId==='string'&&/^[a-z0-9-]{1,40}$/.test(p.islandId);
    if(action==='items.initialize')return keys==='';
    const potionKind=()=>!Object.hasOwn(p,'kind')||['health','mana'].includes(p.kind);
    if(action==='potions.buy')return ['', 'kind', 'quantity', 'kind,quantity'].includes(keys)&&potionKind()&&(!Object.hasOwn(p,'quantity')||Number.isInteger(p.quantity)&&p.quantity>=1&&p.quantity<=99);
    if(action==='potions.use')return ['', 'kind'].includes(keys)&&potionKind();
    if(['items.equip','items.sell','items.open-box','items.use-xp-boost'].includes(action))return keys==='itemId'&&instanceId(p.itemId);
    if(action==='items.lock')return keys==='itemId,locked'&&instanceId(p.itemId)&&typeof p.locked==='boolean';
    if(action==='items.unequip')return keys==='slot'&&originalSlots.includes(p.slot);
    if(action==='forge.execute')return keys==='operation'&&validForge(p.operation);

    if (
      [
        "journey.begin",
        "hunt.begin",
        "hunt.claim",
        "combat.begin",
        "combat.attack",
        "combat.claim",
        "state.sync",
      ].includes(action)
    )
      return keys === "";
    if (["inventory.buy", "inventory.sell"].includes(action))
      return (
        keys === "itemId,quantity" &&
        items.includes(p.itemId) &&
        Number.isInteger(p.quantity) &&
        p.quantity >= 1 &&
        p.quantity <= 100
      );
    if (action === "equipment.equip")
      return keys === "itemId" && items.slice(1).includes(p.itemId);
    if (action === "equipment.unequip")
      return keys === "slot" && ["weapon", "armor"].includes(p.slot);
    return (
      action === "attributes.allocate" &&
      keys === "allocation" &&
      p.allocation &&
      Object.keys(p.allocation).sort().join() ===
        attributes.slice().sort().join() &&
      attributes.every(
        (k) =>
          Number.isInteger(p.allocation[k]) &&
          p.allocation[k] >= 0 &&
          p.allocation[k] <= 2147483647,
      ) &&
      attributes.reduce((sum, k) => sum + p.allocation[k], 0) > 0 &&
      attributes.reduce((sum, k) => sum + p.allocation[k], 0) <= 2147483647
    );
  }
  function mergePartyMotion(full,motion){
    if(!motion)return full?null:full;
    if(!full||!!full.group!==!!motion.group)return null;
    if(!motion.group)return full;
    const a=full.group,b=motion.group,ids=v=>v.members.map(m=>m.id).sort().join(',');
    if(a.id!==b.id||!Array.isArray(b.members)||ids(a)!==ids(b))return null;
    return {...full,group:{...a,...b,members:b.members.map(m=>({...a.members.find(old=>old.id===m.id),...m}))}};
  }
  function createSession({
    fetch,
    storage,
    uuid = () => root.crypto.randomUUID(),
    now = () => Date.now(),
    monotonic = () => root.performance.now(),
    socketFactory = root.location?.protocol==='https:'&&typeof root.WebSocket==='function'
      ? ()=>new root.WebSocket('wss://'+root.location.host+'/v1/realtime','mare.realtime.v1') : null,
  }) {
    let data = null,
      control = null,
      pending = null,
      busy = false,
      available = false,
      renewing = null,
      readVersion = 0;
    let confirmedMovementVersion = -1;
    let networkSample=null;
    let stream=null,streamOpening=false,streamDisabled=false,streamRetryAt=0,streamTimer=null,streamSeq=0;
    let streamFrameAt=null,streamInterval=null,streamRtt=null,streamPing=null,lastMotionFrame=null;
    const streamPending=new Map();
    const streamReady=()=>!!stream&&stream.readyState===1&&streamFrameAt!==null&&monotonic()-streamFrameAt<1500;
    function disconnectRealtime(disable=true){
      streamDisabled=disable;clearInterval(streamTimer);streamTimer=null;
      const old=stream;stream=null;streamFrameAt=null;streamPing=null;
      for(const pending of streamPending.values()){clearTimeout(pending.timer);pending.reject(fault('realtime_disconnected'));}streamPending.clear();
      if(old)old.close();
    }
    function acceptMotionFrame(f){
      if(!data?.online?.world||f?.protocol!==2||f.characterId!==data.character.id||!Number.isSafeInteger(f.version)||f.version<0||!Number.isFinite(Date.parse(f.serverNow))||!f.world||!('battle' in f)||!('lobby' in f)||!('partyMotion' in f)||'fullState' in f)throw fault('invalid_server_state');
      const current=data.online;
      if(f.version<current.state.version||f.version<confirmedMovementVersion||Date.parse(f.world.serverNow)<Date.parse(current.world.serverNow))return;
      const party=mergePartyMotion(current.party,f.partyMotion);
      // Membership/economy remains on the full snapshot. Never fabricate a roster.
      if(f.partyMotion&&!party)return;
      const completed=monotonic();streamInterval=streamFrameAt===null?null:completed-streamFrameAt;streamFrameAt=completed;
      lastMotionFrame=f;
      data={...data,online:{...current,world:f.world,battle:f.battle,lobby:f.lobby,party,weeklyBoss:f.weeklyBoss??null}};
      available=true;notify();
    }
    async function connectRealtime(){
      if(!socketFactory||streamDisabled||stream||streamOpening||now()<streamRetryAt||!available||!control||!data?.online?.world)return;
      streamOpening=true;
      const characterId=data.character.id;
      try{
        const csrf=await csrfToken();
        if(streamDisabled||!control||data?.character?.id!==characterId)return;
        const socket=socketFactory();stream=socket;
        const dropped=()=>{if(stream!==socket)return;streamRetryAt=now()+2000;disconnectRealtime(false);};
        socket.onclose=dropped;socket.onerror=dropped;
        socket.onopen=()=>{
          if(stream!==socket)return;
          socket.send(JSON.stringify({type:'subscribe',characterId,csrfToken:csrf}));
          const heartbeat=()=>{
            if(stream!==socket||socket.readyState!==1)return;
            if(streamPing&&monotonic()-streamPing.at>5000||streamFrameAt!==null&&monotonic()-streamFrameAt>2000){dropped();return;}
            if(!streamPing){streamPing={seq:++streamSeq,at:monotonic()};socket.send(JSON.stringify({type:'ping',seq:streamPing.seq}));}
          };
          heartbeat();streamTimer=setInterval(heartbeat,2000);
        };
        socket.onmessage=event=>{
          if(stream!==socket||data?.character?.id!==characterId)return;
          try{
            const value=JSON.parse(event.data);
            if(value.type==='frame'){acceptMotionFrame(value.frame);return;}
            if(value.type==='pong'){if(streamPing?.seq===value.seq){streamRtt=Math.max(0,monotonic()-streamPing.at);streamPing=null;}return;}
            if(value.type==='error'&&value.status===401){available=false;control=null;data=null;readVersion++;disconnectRealtime();discard();notify();return;}
            const pending=streamPending.get(value.seq);
            if(pending&&(value.type==='ack'||value.type==='error')){
              clearTimeout(pending.timer);streamPending.delete(value.seq);
              if(value.type==='ack')pending.resolve(value.result);
              else pending.reject(Object.assign(fault(value.error||'unavailable'),{status:value.status}));
            }else if(value.type==='error')dropped();
          }catch{dropped();}
        };
      }catch{streamRetryAt=now()+2000;disconnectRealtime(false);}finally{streamOpening=false;}
    }
    function streamCommand(command){
      const seq=++streamSeq;
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{streamRetryAt=now()+2000;disconnectRealtime(false);},2500);
        streamPending.set(seq,{resolve,reject,timer});
        try{stream.send(JSON.stringify({type:'command',seq,command}));}catch{disconnectRealtime(false);}
      });
    }
    let csrfCache=null,csrfFlight=null,csrfGeneration=0,csrfWarmAt=0;
    const clearCsrf=()=>{csrfGeneration++;csrfCache=null;csrfFlight=null;csrfWarmAt=0;};
    function csrfToken(refresh=false){
      if(!refresh&&csrfCache&&now()<csrfCache.until)return Promise.resolve(csrfCache.token);
      if(csrfFlight)return csrfFlight;
      const generation=csrfGeneration;
      const flight=api('/v1/auth/csrf').then(result=>{
        if(generation!==csrfGeneration)throw fault('session_changed');
        csrfCache={token:result.csrfToken,until:now()+30000};return result.csrfToken;
      }).finally(()=>{if(csrfFlight===flight)csrfFlight=null;});
      csrfFlight=flight;return flight;
    }
    function warmCsrf(){
      // Keep the same short cache and binding checks, but avoid putting its
      // refresh round trip between local movement prediction and the POST.
      const time=now();
      if(!control||!available||!csrfCache||time<csrfCache.until-5000||time<csrfWarmAt)return;
      csrfWarmAt=time+5000;
      void csrfToken(true).catch(()=>{});
    }
    const listeners = new Set();
    const notify = () => {
      for (const fn of listeners) fn();
    };
    const discard = () => {
      pending = null;
      storage.removeItem(key);
    };
    const fault = (code) => Object.assign(new Error(code), { code });
    async function api(path, payload, headers = {}, signal = AbortSignal.timeout(10000)) {
      const options = { cache: "no-store", signal, headers };
      if (payload !== undefined) {
        const csrf = await csrfToken();
        headers["content-type"] = "application/json";
        headers["x-csrf-token"] = csrf;
        Object.assign(options, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }
      let response = await fetch(path, options);
      if(response.status===401&&payload===undefined&&/^\/v1\/characters\/[a-f0-9-]+\/(online-state|frame)(\?.*)?$/.test(path)){
        await response.arrayBuffer();
        // A presentation can straddle JWT expiry. Confirm the BFF session via
        // its locked refresh path, then retry this read once. Never retry writes.
        await api('/v1/me',undefined,{},signal);
        response=await fetch(path,options);
      }
      const result = response.status === 204 ? {} : await response.json();
      // Cookie changes invalidate the binding, including an uncertain reset.
      if(payload!==undefined&&path.startsWith('/v1/auth/'))clearCsrf();
      if (!response.ok) {
        if(response.status===401||result.error==='csrf_rejected')clearCsrf();
        if (response.status === 401) {
          networkSample = null;
          available = false;
          data = null;
          control = null;
          confirmedMovementVersion = -1;
          readVersion++;
          discard();
          notify();
        }
        throw Object.assign(fault(result.error || "unavailable"), {
          status: response.status,
        });
      }
      return result;
    }
    function validate(me, online) {
      if (!me.character) return;
      const c = me.character,
        s = online?.state;
      if (
        !/^[a-f0-9-]{36}$/.test(c.id) ||
        !classes.includes(c.classId) ||
        typeof c.name !== "string" ||
        !s ||
        s.characterId !== c.id ||
        !Number.isSafeInteger(s.version) ||
        s.version < 0 ||
        !Number.isInteger(s.level) ||
        s.level < 1 ||
        s.level > 2147483647 ||
        !/^\d{1,19}$/.test(s.gold) ||
        !/^\d{1,19}$/.test(s.experience)
      )
        throw fault("invalid_server_state");
    }
    const stopAuto = (battle) => battle?.auto ? { ...battle, auto: false } : battle;
    function preserveConfirmedMovement(online) {
      if(online&&lastMotionFrame?.characterId===online.state.characterId&&lastMotionFrame.version>=online.state.version&&Date.parse(lastMotionFrame.world.serverNow)>Date.parse(online.world?.serverNow)){
        const f=lastMotionFrame,party=mergePartyMotion(online.party,f.partyMotion);
        online={...online,world:f.world,battle:f.battle,lobby:f.lobby,weeklyBoss:f.weeklyBoss??null,...(party?{party}:{})};
      }
      if (!online || online.state.version >= confirmedMovementVersion) return online;
      const current = data.online;
      const battle = online.world?.mapId === current.world.mapId ? stopAuto(online.battle) : current.battle;
      return { ...online, world: current.world, battle };
    }
    async function read(snapshotOnly=false,{signal}={}) {
      const revision = ++readVersion;
      let me, online;
      try {
        me = snapshotOnly&&data?.character ? {character:data.character} : await api("/v1/me",undefined,{},signal);
        const started=monotonic();
        online = me.character
          ? await api(`/v1/characters/${me.character.id}/online-state`,undefined,{},signal)
          : null;
        validate(me, online);
        const completed=monotonic();
        if(revision===readVersion){
          const same=data?.character?.id===me.character?.id;
          networkSample=online?{rttMs:Math.max(0,completed-started),at:completed,intervalMs:same&&networkSample?Math.max(0,completed-networkSample.at):null}:null;
        }
      } catch (error) {
        if (revision === readVersion) {
          available = false;
          notify();
        }
        throw error;
      }
      if (revision !== readVersion) return;
      if (data?.character?.id !== me.character?.id) {
        disconnectRealtime(false);lastMotionFrame=null;
        clearCsrf();
        control = null;
        pending = null;
        confirmedMovementVersion = -1;
      }
      data = { character: me.character ?? null, online: preserveConfirmedMovement(online) };
      available = true;
      warmCsrf();
      if (!pending && me.character) {
        try {
          const saved = JSON.parse(storage.getItem(key) || "null");
          if (
            saved &&
            saved.characterId === me.character.id &&
            /^[a-f0-9-]{36}$/.test(saved.requestId) &&
            Number.isSafeInteger(saved.expectedVersion) &&
            saved.expectedVersion >= 0 &&
            validIntent(saved.action, saved.payload)
          )
            pending = saved;
          else if (saved) discard();
        } catch {
          discard();
        }
      }
      notify();
      void connectRealtime();
      return data;
    }
    let frameFlight=null;
    async function readFrame({signal}={}){
      if(![1,2].includes(data?.online?.sync?.protocol))return read(true,{signal});
      if(frameFlight)return frameFlight;
      const flight=(async()=>{
        const original=data,revision=++readVersion,started=monotonic();
        try{
          const protocol=original.online.sync.protocol;
          const knownVersion=original.online.state.version;
          const headers=protocol===2?{'x-mare-state-version':String(knownVersion)}:{};
          const f=await api(`/v1/characters/${original.character.id}/frame`,undefined,headers,signal),completed=monotonic();
          if(revision!==readVersion)return;
          if(f.protocol!==protocol||f.characterId!==original.character.id||!Number.isSafeInteger(f.version)||f.version<0||!Number.isFinite(Date.parse(f.serverNow)))throw fault('invalid_server_state');
          const daily=original.online.contracts?.daily;
          const dailyExpired=daily&&Date.parse(f.serverNow)>=daily.endsAt;
          let online;
          if('fullState' in f){
            validate(original,f.fullState);
            if(protocol!==2||f.fullState.sync?.protocol!==protocol||f.fullState.state.version!==f.version||f.version<=knownVersion)throw fault('invalid_server_state');
            if(dailyExpired)return read(true,{signal});
            online=f.fullState;
          }else{
            if(!('world' in f)||!('battle' in f)||!('lobby' in f)||!(protocol===2?'partyMotion' in f:'party' in f))throw fault('invalid_server_state');
            const party=protocol===2?mergePartyMotion(original.online.party,f.partyMotion):f.party;
            // Older servers and changes outside the compact projection still need a full read.
            if(f.version!==knownVersion||(protocol===2&&!party)||dailyExpired)return read(true,{signal});
            online={...original.online,world:f.world,battle:f.battle,lobby:f.lobby,party,weeklyBoss:f.weeklyBoss??null};
          }
          networkSample={rttMs:Math.max(0,completed-started),at:completed,intervalMs:networkSample?Math.max(0,completed-networkSample.at):null};
          data={character:original.character,online:preserveConfirmedMovement(online)};
          available=true;warmCsrf();notify();return data;
        }catch(error){if(revision===readVersion){available=false;notify();}throw error;}
      })().finally(()=>{if(frameFlight===flight)frameFlight=null;});
      frameFlight=flight;return flight;
    }
    async function acquire(takeover = false) {
      if (!data?.character) throw fault("character_required");
      let payload = {};
      if (takeover) {
        const current = await api(`/v1/characters/${data.character.id}`);
        if (current.control) payload = { expectedEpoch: current.control.epoch };
      }
      control = await api(
        `/v1/characters/${data.character.id}/control`,
        payload,
      );
      notify();
      void connectRealtime();
      return control;
    }
    async function send(intent) {
      if (busy || !available || !control || !data?.character)
        throw fault("control_required");
      busy = true;
      notify();
      try {
        const sentControl = control;
        const command={
          requestId: intent.requestId,
          expectedVersion: intent.expectedVersion,
          action: intent.action,
          payload: intent.payload,
          control: { epoch: control.epoch, token: control.token },
        };
        let receipt;
        if(streamReady()&&['world.move','world.stop'].includes(intent.action)){
          try{receipt=await streamCommand(command);}catch(error){
            if(error.code!=='realtime_disconnected')throw error;
            // Same requestId: a committed response lost during disconnect must
            // replay the durable receipt, never create another mutation.
            receipt=await api(`/v1/characters/${intent.characterId}/commands`,command);
          }
        }else receipt=await api(`/v1/characters/${data.character.id}/commands`,command);
        discard();
        const online = data?.online;
        const world = receipt.world;
        // Movement has a complete path receipt. Keep the snapshot version for
        // frame polling so any changes outside the path still come from a full state.
        if ((intent.action === 'world.move' || intent.action === 'world.stop') &&
            control === sentControl && receipt.requestId === intent.requestId &&
            receipt.action === intent.action && data?.character?.id === intent.characterId &&
            receipt.state?.characterId === intent.characterId && online?.world && world &&
            receipt.state.version === intent.expectedVersion + 1 &&
            receipt.state.version >= online.state.version && world.mapId === online.world.mapId &&
            world.rulesHash === online.world.rulesHash &&
            (Date.parse(world.serverNow) >= Date.parse(online.world.serverNow) ||
             lastMotionFrame?.characterId===intent.characterId && lastMotionFrame.version>=receipt.state.version)) {
          confirmedMovementVersion = receipt.state.version;
          // An already received committed frame may be newer than this ACK.
          // Confirm the receipt without rewinding its pose or forcing a full read.
          if(Date.parse(world.serverNow)>=Date.parse(online.world.serverNow))
            data = { ...data, online: { ...online, world, battle: stopAuto(online.battle) } };
          return receipt;
        }
        await read(intent.action!=='profile.identity');
        return receipt;
      } catch (error) {
        if (error.status && error.status < 500) discard();
        if (error.code === "control_conflict") control = null;
        await read(intent.action!=='profile.identity').catch(() => {});
        throw error;
      } finally {
        busy = false;
        notify();
      }
    }
    return {
      enabled: true,
      get network() {
        return networkSample?{rttMs:networkSample.rttMs,ageMs:Math.max(0,monotonic()-networkSample.at),intervalMs:networkSample.intervalMs}:{rttMs:null,ageMs:null,intervalMs:null};
      },
      get realtime(){return {connected:streamReady(),rttMs:streamRtt,intervalMs:streamInterval,ageMs:streamFrameAt===null?null:Math.max(0,monotonic()-streamFrameAt)};},
      connectRealtime,disconnectRealtime,
      get available() {
        return available;
      },
      get data() {
        return data;
      },
      get controlled() {
        return !!control;
      },
      get busy() {
        return busy;
      },
      get pending() {
        return pending;
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      api,
      read,
      load: read,
      readFrame,
      async createCharacter(payload){await api("/v1/characters",payload);await read();},
      acquire,
      async command(action, payload = {}) {
        if (!validIntent(action, payload)) throw fault("invalid_intent");
        if (pending || busy) throw fault("pending_command");
        if (!available || !control || !data?.character)
          throw fault("control_required");
        const intent = {
          characterId: data.character.id,
          requestId: uuid(),
          expectedVersion: Math.max(data.online.state.version, confirmedMovementVersion),
          action,
          payload: JSON.parse(JSON.stringify(payload)),
        };
        if(action!=='message.send')storage.setItem(key, JSON.stringify(intent));
        pending = intent;
        return send(pending);
      },
      async resume() {
        if (!pending) throw fault("no_pending_command");
        return send(pending);
      },
      renew() {
        if (renewing) return renewing;
        if (!available || !data?.character) return Promise.resolve();
        renewing = (async () => {
          const current = control;
          if (!current) return acquire();
          try {
            await api(`/v1/characters/${data.character.id}/control/renew`, {
              epoch: current.epoch, token: current.token,
            });
          } catch (error) {
            if (control !== current || error.code !== "control_conflict") throw error;
            control = null;
            notify();
            // No expectedEpoch: the server may grant only a free/expired lease.
            // A live controller on another tab/device must never be displaced.
            return acquire();
          }
        })().finally(() => { renewing = null; });
        return renewing;
      },
      async logout() {
        await api("/v1/auth/logout", { scope: "local" });
        disconnectRealtime();lastMotionFrame=null;
        readVersion++;
        control = null;
        data = null;
        confirmedMovementVersion = -1;
        networkSample = null;
        discard();
        notify();
      },
    };
  }
  root.MareGameSessionFactory = { createSession, validIntent, mergePartyMotion };
  if (typeof module !== "undefined")
    module.exports = { createSession, validIntent, mergePartyMotion };
  if (typeof document !== "undefined") {
    root.MareGameSession = createSession({
      fetch: root.fetch.bind(root),
      storage: root.sessionStorage,
    });
    document.body.classList.add("online-game", "online-session-loading");
  }
})(globalThis);
