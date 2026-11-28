'use strict';

const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const seconds = Number(process.argv[3] || 120);
const scope = process.argv[4] || 'focus';
const classFilter = process.argv[5] || 'all';
if (!Number.isSafeInteger(seconds) || seconds < 30) throw Error('Informe pelo menos 30 segundos por caçada.');

const game = name => require(path.join(root, name));
const engine = game('world-battle.cjs');
const world = game('world-catalog.cjs').load();
const characters = game('character-system.js');
const attributes = game('attribute-rules.js');
const forge = game('forge-system.js');
const akuma = game('akuma-system.js');
const talents = game('talent-system.js');
const achievements = game('achievement-system.js');
const haki = game('haki-system.js');
const mastery = game('haki-progression.js');
const defs = game('item-catalog.js').create({forge, akuma, prison: game('prison-system.js'), haki, hakiProgression: mastery}).items;

const islands = world.islands.filter(island => island.area && engine.hunt.get(island.area));
const classes = Object.keys(engine.catalog.classes).filter(id => classFilter === 'all' || id === classFilter);
if (!classes.length) throw Error('Classe desconhecida: ' + classFilter);
const factionId = 'pirate';
const faction = engine.catalog.factions[factionId];
const slots = ['weapon', 'coat', 'legs', 'boots', 'gloves', 'head', 'ring', 'necklace', 'belt', 'cloak', 'charm'];
const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const seedRandom = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const highestAt = level => islands.findLast(island => island.minLevel <= level);
const primaryAttribute = classId => {
  if (characters.roles[classId].magic) return 'intelligence';
  return ['rogue', 'gunner'].includes(classId) ? 'dexterity' : 'strength';
};

function equipmentAt(classId, level, sourceArea, profile) {
  const efficient = profile === 'efficient';
  const basic = profile === 'basic';
  const slotCount = level < 10 ? 2 : level < 20 ? 5 : level < 40 ? 7 : level < 70 ? 9 : slots.length;
  const equipment = {};
  const equipmentLevel = forge.lootLevel(level, engine.hunt.get(sourceArea));
  // Projected attainable sets at each stage, not the best possible rolls at every slot.
  const potential = basic ? 20 : efficient ? (level < 20 ? 35 : level < 50 ? 45 : level < 100 ? 55 : 65) : (level < 20 ? 25 : level < 60 ? 35 : 45);
  for (const [index, slot] of slots.slice(0, slotCount).entries()) {
    const weapon = slot === 'weapon';
    const rank = basic ? 0 : efficient && weapon
      ? (level < 11 ? 0 : level < 25 ? 1 : level < 55 ? 2 : level < 115 ? 3 : 4)
      : efficient
        ? (level < 15 ? 0 : level < 35 ? 1 : level < 90 ? 2 : level < 140 || index % 3 !== 0 ? 3 : 4)
        : (level < 16 ? 0 : level < 35 ? 1 : level < 100 || index % 3 !== 0 ? 2 : 3);
    const prefer = rarities.slice(0, rank + 1).reverse();
    if (level >= 20) prefer.push('uncommon', 'rare');
    const eligible = d => d.slot === slot && !d.kind && !d.unavailable && (!weapon || d.type === classId);
    const def = prefer.map(rarity => defs.findIndex(d => eligible(d) && d.rarity === rarity)).find(i => i >= 0);
    if (def === undefined) continue;
    const plus = basic ? 0 : efficient
      ? (level < 11 ? Number(weapon && level >= 5) : level < 35 ? (weapon ? 3 : 1) : level < 80 ? (weapon ? 5 : 3) : (weapon ? 7 : 4))
      : (level < 16 ? 0 : level < 50 ? (weapon ? 2 : 1) : level < 100 ? (weapon ? 3 : 2) : (weapon ? 5 : 3));
    const item = forge.generateItem({id: slot, def, plus, level: equipmentLevel}, defs, seedRandom(8191 + index), {potential});
    if (level >= 60 && item.sockets?.length && (weapon || efficient && index <= 3)) {
      const pearlLevel = efficient ? (level >= 125 ? 3 : 2) : 1;
      item.sockets[0] = forge.pearls.find(p => p.level === pearlLevel && p.attribute === primaryAttribute(classId)).id;
    }
    equipment[slot] = item;
  }
  return equipment;
}

function fruitAt(classId, level, profile) {
  if (profile === 'basic' || level < 20) return null;
  const efficient = profile === 'efficient';
  const magic = characters.roles[classId].magic;
  const ranged = magic || ['gunner', 'cyborg'].includes(classId);
  let id = efficient ? 'akuma_tori_albatroz' : 'akuma_kuku_kuku';
  if (level >= (efficient ? 50 : 60)) id = ranged ? 'akuma_doru_doru' : 'akuma_inu_wolf';
  if (level >= (efficient ? 90 : 105)) id = magic ? 'akuma_kobu_kobu' : ranged ? 'akuma_mato_mato' : 'akuma_ushi_bison';
  if (level >= (efficient ? 135 : 150)) id = magic ? 'akuma_hoya_hoya' : ranged ? 'akuma_jiki_jiki' : 'akuma_ryu_ryu';
  const def = defs.findIndex(d => d.fruitId === id && !d.unavailable);
  return def < 0 ? null : {def, fruitId: id};
}

function hakiAt(level, profile) {
  if (level < 50 || profile === 'basic') return {state: null, fragments: 0};
  const book = {id: 'will-book', def: defs.findIndex(d => d.kind === 'haki-book')};
  let state = haki.unlock({level, haki: {mastery: mastery.empty()}, inventory: [book]}, book.id, defs).state;
  // Unlock is obtainable at Don Krieg. Training is a separate market-supply assumption.
  const stock = profile === 'efficient' ? (level < 100 ? 0 : level < 151 ? 6 : 46) : 0;
  const fragment = defs.findIndex(d => d.kind === 'haki-fragment' && d.branch === 'armament');
  if (stock && fragment >= 0) {
    state.inventory.push({id: 'fragment', def: fragment, qty: stock});
    for (const node of mastery.branches.armament) {
      for (let rank = 0; rank < node.max; rank++) {
        const next = mastery.invest(state, node.id, state.haki.mastery.seq, defs, () => true);
        if (!next.ok) return {state: state.haki, fragments: stock - mastery.quantity(state, 'armament', defs)};
        state = next.state;
      }
    }
    state = haki.configure(state, 'armament', true) || state;
  }
  return {state: state.haki, fragments: stock};
}

function talentsAt(fighter, stats, hakiState, profile) {
  let build = talents.empty();
  if (profile === 'basic') return build;
  const {classId, level} = fighter;
  const efficient = profile === 'efficient';
  const milestones = {
    ...fighter,
    talentVersion: talents.VERSION,
    talentLegacyBudget: 0,
    stats: {kills: Math.floor((level - 1) ** 1.7 * (efficient ? 3 : 2))},
    achievements: {version: achievements.VERSION, claimed: [], records: {
      peakPower: stats.power,
      coins: Math.floor((level - 1) ** 2.1 * (efficient ? 110 : 70)),
      islands: islands.filter(island => island.minLevel <= level).map(island => island.id),
      haki: hakiState?.auto ? [hakiState.auto] : []
    }}
  };
  milestones.achievements.claimed = achievements.list(milestones).filter(a => a.ready).map(a => a.id);
  const tree = talents.getTree(classId);
  const preferred = {healer: 2, cyborg: 1, gunner: 2, sword: 1}[classId] ?? 0;
  const secondary = {healer: 1, cyborg: 0, gunner: 0, sword: 0}[classId] ?? 1;
  for (const branch of [tree.branches[preferred], tree.branches[secondary]]) {
    for (const node of branch.nodes) {
      for (let rank = 0; rank < (efficient ? 7 : 5); rank++) {
        const result = talents.invest(milestones, build, node.id);
        if (!result.ok) break;
        build = result.build;
      }
      const keystone = {brawler:'growing',sword:'bloodlust',gunner:'longshot',rogue:'poison',cyborg:'unstable',strategist:'echo',healer:'rejuvenation'}[classId];
      if (!build.keystone && talents.commonSpent(build) >= talents.KEYSTONE_GATE) {
        const next = talents.invest(milestones, build, keystone);
        if (next.ok) build = next.build;
      }
      if (talents.spent(build) >= talents.totalEarned(milestones)) return build;
    }
  }
  return build;
}

function makeActor(classId, level, sourceArea, profile) {
  const policy = profile === 'developed' ? 'efficient' : profile;
  const equipment = equipmentAt(classId, level, sourceArea, policy);
  const fruit = fruitAt(classId, level, policy);
  const haki = hakiAt(level, policy);
  const fighter = {classId, level, attributes: attributes.distribute(characters.earned(level), classId).allocation};
  const gear = akuma.applyGear(forge.aggregate(equipment, defs), fruit, defs);
  const baseStats = characters.derive(fighter, engine.catalog.classes[classId], faction, gear);
  const build = talentsAt(fighter, baseStats, haki.state, policy);
  return {baseStats, build, fruitId: fruit?.fruitId ?? null, haki,
    gear: Object.values(equipment).map(i => [i.def, i.level, i.rarity, i.plus, i.potential, i.sockets])};
}

function measure(classId, level, island, profile, actor) {
  const rng = seedRandom(level + 137);
  const nav = world.navigation(world.mapId(island.area));
  const hero = {...nav.map.spawn, direction: 'front'};
  const battle = engine.create(island.area, actor.baseStats, 1000, rng);
  const context = {hero, nav, stats: actor.baseStats, baseStats: actor.baseStats, fruitId: actor.fruitId,
    build: actor.build, classId, factionId, level, rng};
  if (actor.haki.state) battle.haki = structuredClone(actor.haki.state);
  const initial = engine.combatStats(battle, {...context, now: 1000});
  battle.hp = initial.maxHP;
  battle.energy = initial.maxEnergy;
  battle.auto = true;
  battle.autoSkills = true;
  const firstHit = new Map();
  const monsters = {};
  let seq = 0, kills = 0, xp = 0, berry = 0, received = 0, deaths = 0, hitsToKillSeconds = 0, moved = 0, recoverySeconds = 0, used = 0;
  let fruitCasts = 0, classCasts = 0, hakiSeconds = 0;
  let potions = ['efficient', 'developed'].includes(profile) ? Math.ceil(seconds / 10) : Math.ceil(seconds / 30);
  for (let elapsed = .25; elapsed <= seconds; elapsed += .25) {
    const {x, y} = hero;
    const step = engine.step(battle, {...context, now: 1000 + elapsed * 1000, dt: .25, potions});
    moved += Math.hypot(hero.x - x, hero.y - y);
    if (battle.respawn > 0) recoverySeconds += .25;
    if (battle.hakiRuntime.active) hakiSeconds += .25;
    potions -= step.potionsUsed;
    used += step.potionsUsed;
    for (const event of battle.events) {
      if (event.seq <= seq) continue;
      if (event.type === 'damage' && !firstHit.has(event.id)) firstHit.set(event.id, elapsed);
      if (event.type === 'hurt') received += event.amount;
      if (event.type === 'death') deaths++;
      if (event.type === 'fruit') fruitCasts++;
      if (event.type === 'skill') classCasts++;
    }
    seq = battle.seq;
    for (const {id, reward, monster} of step.kills) {
      kills++;
      monsters[monster.type] = (monsters[monster.type] || 0) + 1;
      xp += reward.xp;
      berry += Math.round(reward.gold * faction.gold);
      hitsToKillSeconds += elapsed - (firstHit.get(id) ?? elapsed) + .25;
      firstHit.delete(id);
    }
  }
  return {
    classId, level, map: island.name, area: island.area, profile, seconds, kills, monsters, xp, berry,
    xpPerMin: xp / seconds * 60, xpPerHour: xp / seconds * 3600, xpPerKill: kills ? xp / kills : null,
    killsPerHour: kills / seconds * 3600, hitToKill: kills ? hitsToKillSeconds / kills : null,
    received, receivedHPBars: received / initial.maxHP, moved, deaths, recoverySeconds, potions: used,
    equipped: actor.gear, talents: actor.build.nodes, keystone: actor.build.keystone,
    fruitId: actor.fruitId, passiveFruit: actor.fruitId, fruitCasts, classCasts,
    hakiUnlocked: !!battle.haki.unlocked, hakiFragments: actor.haki.fragments, hakiSeconds,
    initialStats: {attack: initial.attack, defense: initial.defense, maxHP: initial.maxHP, speed: initial.speed}
  };
}

const milestones = new Set(['dawn', 'conchas', 'arlong', 'alabasta-desert', islands.at(-1).id]);
for (const region of ['alabasta', 'skypiea', 'enies-lobby', 'thriller-bark', 'sabaody', 'marineford']) {
  const island = islands.find(i => i.region === region && !milestones.has(i.id));
  if (island) milestones.add(island.id);
}
const comparisons = new Set(['conchas', 'arlong', 'alabasta-desert', 'skypiea-01', 'enies-lobby-01', 'thriller-bark-01', 'marineford-01']);
const progressionLevels = [...new Set([...islands.map(i => i.minLevel).filter(level => level < 185), 10, 20, 45, 100, 125, 135, 150, 180, 184])].sort((a, b) => a - b);
const emit = (target, level, profiles, candidates) => {
  const previous = islands[islands.indexOf(target) - 1];
  for (const classId of classes) {
    for (const profile of profiles) {
      const source = ['efficient', 'developed'].includes(profile) && level > target.minLevel ? target : previous || target;
      const actor = makeActor(classId, level, source.area, profile);
      for (const island of candidates) {
        console.log(JSON.stringify({reference: target.name, referenceArea: target.area, ...measure(classId, level, island, profile, actor)}));
      }
    }
  }
};

if (scope === 'progression' || scope === 'transitions' || scope.startsWith('level:')) {
  const levels = scope === 'progression' ? progressionLevels : scope === 'transitions'
    ? islands.filter(i => comparisons.has(i.id)).map(i => i.minLevel)
    : [Number(scope.slice('level:'.length))];
  for (const level of levels) {
    const target = highestAt(level);
    if (!Number.isSafeInteger(level) || !target || level > 185) throw Error('Nível fora da simulação: ' + level);
    const previous = islands[islands.indexOf(target) - 1];
    emit(target, level, ['normal', 'efficient'], scope !== 'progression' && previous ? [target, previous] : [target]);
  }
} else {
  const chosen = islands.filter(island => scope === 'all' || (scope === 'focus' ? milestones.has(island.id) : island.id === scope));
  if (!chosen.length) throw Error('Nenhuma ilha corresponde a ' + scope);
  for (const [index, target] of islands.entries()) {
    if (!chosen.includes(target)) continue;
    const previous = islands[index - 1];
    const candidates = previous ? [target, previous] : [target];
    const older = islands.slice(0, Math.max(0, index - 1));
    const earlier = [...older].reverse().find(i => i.region !== previous?.region) || older.at(-1);
    if (earlier) candidates.push(earlier);
    const profiles = ['dawn', 'conchas', 'alabasta-desert', islands.at(-1).id].includes(target.id)
      ? ['basic', 'normal', 'developed'] : ['normal'];
    emit(target, target.minLevel, profiles, candidates);
  }
}
