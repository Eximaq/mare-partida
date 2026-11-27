'use strict';

const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const seconds = Number(process.argv[3] || 120);
const scope = process.argv[4] || 'focus';
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
const defs = game('item-catalog.js').create({
  forge, akuma, prison: game('prison-system.js'),
  haki: game('haki-system.js'), hakiProgression: game('haki-progression.js')
}).items;

const islands = world.islands.filter(island => island.area && engine.hunt.get(island.area));
const milestones = new Set(['dawn', 'conchas', 'arlong', 'alabasta-desert']);
for (const region of ['alabasta', 'skypiea', 'enies-lobby', 'thriller-bark', 'sabaody', 'marineford']) {
  const island = islands.find(i => i.region === region && !milestones.has(i.id));
  if (island) milestones.add(island.id);
}
const last = islands.at(-1);
milestones.add(last.id);
const chosen = islands.filter(island => scope === 'all' || (scope === 'focus' ? milestones.has(island.id) : island.id === scope));
if (!chosen.length) throw Error('Nenhuma ilha corresponde a ' + scope);
const faction = engine.catalog.factions.pirate;
const slots = ['weapon', 'coat', 'legs', 'boots', 'gloves', 'head', 'ring'];
const seedRandom = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;

function makeActor(classId, level, sourceArea, profile) {
  const rule = {
    basic: { plus: 0, potential: 20, rarities: ['common'] },
    normal: { plus: level < 16 ? 0 : 2, potential: level < 16 ? 35 : 55, rarities: ['uncommon', 'common', 'rare'] },
    developed: { plus: level < 16 ? 1 : 4, potential: 70, rarities: ['rare', 'uncommon', 'epic'] }
  }[profile];
  const equipment = {};
  const possibleSlots = slots.slice(0, level < 11 ? 2 : level < 31 ? 5 : 7);
  for (const [index, slot] of possibleSlots.entries()) {
    const eligible = d => d.slot === slot && !d.kind && !d.unavailable && (slot !== 'weapon' || d.type === classId);
    const rarity = level < 11 ? 'common' : rule.rarities[index % rule.rarities.length];
    const preferred = defs.findIndex(d => eligible(d) && d.rarity === rarity);
    const def = preferred >= 0 ? preferred : defs.findIndex(d => eligible(d) && d.rarity === 'common');
    if (def < 0) continue;
    equipment[slot] = forge.generateItem({
      id: slot, def, plus: rule.plus, level: forge.lootLevel(level, engine.hunt.get(sourceArea))
    }, defs, seedRandom(8191 + index), { potential: rule.potential });
  }
  const fighter = { classId, level, attributes: attributes.distribute(characters.earned(level), classId).allocation };
  const keep = achievements.catalog.filter(a => a.metric === 'level' && a.target <= level);
  const claimed = profile === 'basic' ? [] : keep.slice(0, profile === 'normal' ? 2 : keep.length).map(a => a.id);
  let build = talents.empty();
  const talentActor = { ...fighter, talentVersion: talents.VERSION, achievements: { claimed } };
  const node = talents.nodes(classId).find(item => talents.eligibility(talentActor, build, item.id).ok);
  for (let i = 0; node && i < talents.totalEarned(talentActor); i++) {
    const next = talents.invest(talentActor, build, node.id);
    if (!next.ok) break;
    build = next.build;
  }
  let fruit = null;
  if (profile === 'developed' && level >= 21) {
    const rank = level < 40 ? 'E' : 'D';
    const def = defs.findIndex(d => d.fruitId && akuma.byId(d.fruitId)?.rank === rank && !d.unavailable);
    if (def >= 0) fruit = { def, fruitId: defs[def].fruitId };
  }
  const gear = akuma.applyGear(forge.aggregate(equipment, defs), fruit, defs);
  const stats = characters.derive(fighter, engine.catalog.classes[classId], faction, gear);
  return { stats, build, fruit: fruit?.fruitId ?? null, gear: Object.values(equipment).map(i => [i.def, i.level, i.rarity, i.plus, i.potential]) };
}

function measure(classId, level, island, profile, actor) {
  const rng = seedRandom(level + 137);
  const nav = world.navigation(world.mapId(island.area));
  const hero = { ...nav.map.spawn, direction: 'front' };
  const battle = engine.create(island.area, actor.stats, 1000, rng);
  battle.auto = true;
  battle.autoSkills = true;
  const firstHit = new Map();
  let seq = 0, kills = 0, xp = 0, berry = 0, received = 0, deaths = 0, hitsToKillSeconds = 0, moved = 0, recoverySeconds = 0, potions = 4, used = 0;
  for (let elapsed = .25; elapsed <= seconds; elapsed += .25) {
    const { x, y } = hero;
    const step = engine.step(battle, {
      hero, nav, stats: actor.stats, build: actor.build, classId, factionId: 'pirate', level,
      now: 1000 + elapsed * 1000, dt: .25, rng, potions
    });
    moved += Math.hypot(hero.x - x, hero.y - y);
    if (battle.respawn > 0) recoverySeconds += .25;
    potions -= step.potionsUsed;
    used += step.potionsUsed;
    for (const event of battle.events) {
      if (event.seq <= seq) continue;
      if (event.type === 'damage' && !firstHit.has(event.id)) firstHit.set(event.id, elapsed);
      if (event.type === 'hurt') received += event.amount;
      if (event.type === 'death') deaths++;
    }
    seq = battle.seq;
    for (const { id, reward } of step.kills) {
      kills++;
      xp += reward.xp;
      berry += Math.round(reward.gold * faction.gold);
      hitsToKillSeconds += elapsed - (firstHit.get(id) ?? elapsed) + .25;
      firstHit.delete(id);
    }
  }
  const maxHp = engine.combatStats(battle, { classId, level, stats: actor.stats, build: actor.build }).maxHP;
  return {
    classId, level, map: island.name, area: island.area, profile, seconds, kills, xp, berry,
    xpPerMin: xp / seconds * 60, hitToKill: kills ? hitsToKillSeconds / kills : null,
    received, receivedHPBars: received / maxHp, moved, deaths, recoverySeconds, potions: used,
    equipped: actor.gear, talents: actor.build.nodes, passiveFruit: actor.fruit
  };
}

for (const [index, target] of islands.entries()) {
  if (!chosen.includes(target)) continue;
  const level = target.minLevel;
  const previous = islands[index - 1];
  const candidates = previous ? [target, previous] : [target];
  const older = islands.slice(0, Math.max(0, index - 1));
  const earlier = [...older].reverse().find(i => i.region !== previous?.region) || older.at(-1);
  if (earlier) candidates.push(earlier);
  const profiles = ['dawn', 'conchas', 'alabasta-desert', last.id].includes(target.id)
    ? ['basic', 'normal', 'developed'] : ['normal'];
  for (const classId of Object.keys(engine.catalog.classes)) {
    for (const profile of profiles) {
      const actor = makeActor(classId, level, previous?.area || target.area, profile);
      for (const island of candidates) {
        console.log(JSON.stringify({ reference: target.name, ...measure(classId, level, island, profile, actor) }));
      }
    }
  }
}
