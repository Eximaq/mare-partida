'use strict';

const fs = require('node:fs');
const contracts = require('../contract-system.js');
const dungeons = require('../boss-dungeon-system.js');
const levels = require('../character-catalog.js');
const hunt = require('../hunt-system.js');
const monsters = require('../monster-catalog.js');
const atlas = require('../archipelago.js');

const endLevel = 185;
const hoursPerDay = 14;
const hour = 3_600_000;
const monday = Date.UTC(2026, 0, 5);
const ownXp = Object.fromEntries(contracts.quests.map(q => [q.id, q]));
const blocks = [1, ...Array.from({ length: 37 }, (_, i) => 5 * (i + 1))];
const earlyHours = [.55, 1.15, 1.9, 2.55, 3.05, 3.45, 3.8, 4.15, 4.5, 4.9];
const lateWeights = Array.from({length: 27}, (_, i) => 1.1 ** i);
const sum = numbers => numbers.reduce((a, b) => a + b, 0);
const speedFor = (row, key) => row[key] * 3600 / row.seconds;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function movementRate(row) {
  const kills = row.kills ?? 0;
  const monsters = row.monsters && !Array.isArray(row.monsters) ? row.monsters : {};
  return {
    kills: speedFor(row, 'kills'),
    berry: speedFor(row, 'berry'),
    bossShare: kills ? (monsters.boss ?? 0) / kills : 0,
    area: row.area,
    level: row.level,
    classId: row.classId
  };
}

function nearby(rows, level) {
  const next = rows.findIndex(row => row.level >= level);
  return next < 0 ? [rows.at(-1), rows.at(-1)]
    : next === 0 ? [rows[0], rows[0]]
    : [rows[next - 1], rows[next]];
}

function interpolate(rows, level) {
  const [lo, hi] = nearby(rows, level);
  const mix = lo === hi ? 0 : (level - lo.level) / (hi.level - lo.level);
  return {
    kills: lo.kills + (hi.kills - lo.kills) * mix,
    berry: lo.berry + (hi.berry - lo.berry) * mix,
    bossShare: lo.bossShare + (hi.bossShare - lo.bossShare) * mix,
    classId: lo.classId,
    measured: lo.level === level || hi.level === level
  };
}

function routeAt(area, level, sample, prior) {
  const region = hunt.get(area);
  const sector = region.sectors[0], type = sector.roles[0];
  const monster = {...hunt.profile(area, sector.id, type), type, district: sector.id, name: monsters[type]?.name ?? type};
  const normalXp = prior && area === 'swamp'
    ? 26 * hunt.mapXpMultiplier(area, level) : hunt.rewards(area, monster, level).xp;
  const lastSector = region.sectors.at(-1);
  const bossXp = sample.bossShare > 0 && region.boss
    ? hunt.rewards(area, {type: 'boss', district: lastSector.id}, level).xp : normalXp;
  const bossShare = region.boss ? sample.bossShare : 0;
  return {...sample, level, area, monster, normalXp, bossXp, bossShare};
}

function huntPerHour(rate, crew) {
  const withCrew = xp => Math.round(xp * (1 + crew));
  return rate.kills * ((1 - rate.bossShare) * withCrew(rate.normalXp)
    + rate.bossShare * withCrew(rate.bossXp));
}

function makeRoutes(rows, prior = false) {
  const grouped = new Map();
  for (const row of rows) {
    if (!['normal', 'efficient'].includes(row.profile)) continue;
    const key = row.profile + ':' + row.classId;
    if (!grouped.has(key)) grouped.set(key, new Map());
    const areas = grouped.get(key);
    if (!areas.has(row.area)) areas.set(row.area, []);
    areas.get(row.area).push(movementRate(row));
  }
  const routes = [];
  for (const [key, areas] of grouped) {
    const [profile, classId] = key.split(':');
    const comparator = (a, b) => a.level - b.level;
    for (const rows of areas.values()) rows.sort(comparator);
    const primary = [...areas.values()].flat().filter(r => levels.latestHuntMap(r.level)?.area === r.area).sort(comparator);
    if (!primary.length) throw Error('Faltam medições no mapa da faixa para ' + key);
    const byLevel = [null];
    for (let n = 1; n < endLevel; n++) {
      const area = levels.latestHuntMap(n).area;
      const exact = areas.get(area);
      const base = interpolate(exact ?? primary, n);
      const band = routeAt(area, n, {...base, measured: !!exact && base.measured}, prior);
      const alternatives = [band];
      for (const [candidate, rows] of areas) {
        if (candidate === area || !atlas.canTravel(atlas.byArea(candidate).id, n)) continue;
        if (!rows.some(r => Math.abs(r.level - n) <= 4 && levels.latestHuntMap(r.level).area !== candidate)) continue;
        alternatives.push(routeAt(candidate, n, interpolate(rows, n), prior));
      }
      byLevel[n] = alternatives.reduce((best, r) => huntPerHour(r, 0) > huntPerHour(best, 0) ? r : best);
    }
    routes.push({name: key, profile, classId, byLevel, crew: profile === 'efficient' ? .10 : 0});
  }
  if (routes.filter(r => r.profile === 'normal').length !== 7 || routes.filter(r => r.profile === 'efficient').length !== 7)
    throw Error('São necessárias medições das sete classes nos dois perfis.');
  return routes;
}

function completion(curve, route, options = {}) {
  const {bought = 0, unlimited = false, capHours = 10000, stopAt = endLevel} = options;
  const duty = route.profile === 'efficient' ? 1 : .96;
  const awarded = new Set();
  const questKills = {};
  const rateAt = route.byLevel;
  let level = 1, xp = 0, played = 0, dayKey, weekKey, daily, weekly;
  let stock = 0, boostsUsed = 0, ownBoosts = 0, boostEnd = 0, daySpent = 0;
  const totals = () => ({hours: 0, kills: 0, battleHours: 0, battle: 0, bonus: 0, other: 0, levels: [], areas: new Set()});
  let block = totals();
  const audit = [];
  while (level < stopAt && played < capHours) {
    const rate = rateAt[level];
    const dayIndex = Math.floor((played + 1e-9) / hoursPerDay);
    const today = dayIndex * hoursPerDay;
    const now = monday + (dayIndex * 24 + played - today) * hour;
    const day = contracts.day(now), week = contracts.week(now);
    if (day !== dayKey) {
      dayKey = day;
      daySpent = 0;
      daily = contracts.daily({cycle: day, level, classId: rate.classId});
    }
    if (week !== weekKey) {
      weekKey = week;
      weekly = contracts.weekly({cycle: week, level, classId: rate.classId});
    }
    if (boostEnd <= played + 1e-10 && (unlimited || stock > 0 || bought > daySpent)) {
      if (stock > 0) stock--; else daySpent++;
      ++boostsUsed;
      boostEnd = played + contracts.dailyRules.boostMs / hour;
    }
    const boosted = boostEnd > played + 1e-10;
    const huntXp = huntPerHour(rate, route.crew) * duty;
    const boost = boosted ? contracts.dailyRules.xpMultiplier : 1;
    const remaining = curve[level] - xp;
    const dt = Math.min(1/30, today + hoursPerDay - played,
      boosted ? boostEnd - played : Infinity, remaining / (huntXp * boost));
    if (!(dt > 0) || !Number.isFinite(dt)) throw Error('Taxa inválida no nível '+level+' da rota '+route.name);
    const kills = rate.kills * dt * duty;
    const berries = rate.berry * dt * duty;
    const bossKills = kills * rate.bossShare;
    const earned = huntXp * dt;
    xp += earned * boost;
    played += dt;
    block.hours += dt;
    block.kills += kills;
    block.battleHours += dt * duty;
    block.battle += earned;
    block.bonus += earned * (boost - 1);
    block.areas.add(rate.area);

    for (const q of contracts.matching({area: rate.area, monster: rate.monster})
        .concat(bossKills > 0 ? contracts.quests.filter(q => q.stat === 'boss' || q.area === rate.area && q.metric === 'bosses') : [])) {
      questKills[q.id] = (questKills[q.id] ?? 0) + (q.metric === 'bosses' || q.stat === 'boss' ? bossKills : kills);
      if (questKills[q.id] >= q.target && !awarded.has(q.id)) {
        awarded.add(q.id);
        const points = ownXp[q.id].xp * boost;
        xp += points;
        block.other += points;
      }
    }
    for (const id of ['alvida', 'morgan']) {
      if (level < dungeons.byId[id].level || awarded.has(id)) continue;
      awarded.add(id);
      const points = dungeons.reward({level, characterId: 'calibration'}, id, levels.legacyXpNeeded).xp * boost;
      xp += points;
      block.other += points;
    }

    for (const [cycle, grant] of [[daily, contracts.dailyRules.dailyBoosts], [weekly, contracts.dailyRules.weeklyBoosts]]) {
      if (cycle.claimed) continue;
      // The same eligible measured stream advances both objectives. Fractions
      // represent the mean rate of confirmed kills, not extra reward units.
      for (const q of cycle.objectives) {
        if (q.minMonster && rate.monster.level < q.minMonster) continue;
        q.current = Math.min(q.target, q.current + (q.id.endsWith('-berry') ? berries : kills));
      }
      if (contracts.dailyComplete(cycle)) {
        cycle.claimed = true;
        stock += grant;
        ownBoosts += grant;
      }
    }

    while (level < stopAt && xp + 1e-6 >= curve[level]) {
      xp = Math.max(0, xp - curve[level]);
      block.levels.push(level++);
      if (blocks.includes(level)) {
        const need = sum(block.levels.map(l => curve[l]));
        audit.push({...block, areas:[...block.areas], need, end:level, accumulated:played});
        block = totals();
      }
    }
    // Boosts use wall time and cannot continue through the ten hours offline.
    if (played >= today + hoursPerDay - 1e-9) boostEnd = played;
  }
  if (level < stopAt) throw Error('Projeção incompleta para ' + route.name + ': nível '+level);
  return {name:route.name, level, hours:played, days:played/hoursPerDay, ownBoosts, boostsUsed, audit};
}

function shape(normal, efficient, earlyScale, lateScale) {
  const costs = [0];
  const unit = 600 / sum(lateWeights);
  for (let i = 0; i < blocks.length - 1; i++) {
    const start = blocks[i], end = blocks[i+1];
    const block = i < earlyHours.length ? earlyHours[i] * earlyScale : lateWeights[i-earlyHours.length] * unit * lateScale;
    for (let level = start; level < end; level++) {
      const position = level - start;
      const fraction = i === 0 ? [.08, .16, .29, .47][position] : [.192,.196,.200,.204,.208][position];
      const reference = level < 50 ? median(normal.map(route => huntPerHour(route.byLevel[level], 0)))
        : huntPerHour(efficient.byLevel[level], efficient.crew);
      const requested = Math.max(1, Math.ceil(block * fraction * reference));
      const previous = costs[level-1];
      const cap = level <= 4 ? 2.75 : level <= 20 ? 1.43 : 1.13;
      costs[level] = previous ? Math.max(previous+1, Math.min(requested, Math.ceil(previous*cap))) : requested;
    }
  }
  return costs;
}

function fastestRoute(optimized) {
  const byLevel = [null];
  for (let level = 1; level < endLevel; level++)
    byLevel[level] = optimized.map(r => r.byLevel[level]).reduce((a, b) => huntPerHour(b,.10) > huntPerHour(a,.10) ? b : a);
  return {name:'efficient:envelope',profile:'efficient',crew:.10,byLevel};
}

function search(measure, target, maxScale) {
  let lo = 0.65, hi = maxScale;
  for(let i = 0; i < 14; i++){
    const tryScale = (lo + hi) / 2;
    if (measure(tryScale) >= target) hi = tryScale; else lo = tryScale;
  }
  return hi;
}

function project(rows, cost, calibrate) {
  const routes = makeRoutes(rows);
  const normals = routes.filter(r => r.profile === 'normal');
  const optimized = routes.filter(r => r.profile === 'efficient');
  const frontier = fastestRoute(optimized);
  // The target route can buy additional 1h boosts each active day, on top of
  // those actually unlocked by its own daily and weekly progress.
  const efficientOptions = {bought: 2};
  const old = Array.from({length:endLevel}, (_, level) => level ? (levels.version4XpNeeded ?? levels.xpNeeded)(level) : 0);
  const before = makeRoutes(rows, true).map(route => completion(old, route, route.profile === 'efficient' ? efficientOptions : {}));
  const early = search(scale => median(normals.map(route =>
    completion(shape(normals, frontier, scale, 1), route, {stopAt:50}).hours)), 30, 2.75);
  const late = search(scale => completion(shape(normals, frontier, early, scale), frontier, efficientOptions).hours, 650, 2.4);
  const next = calibrate ? shape(normals, frontier, early, late) : Array.from({length:endLevel}, (_, level) => level ? cost(level) : 0);
  const after = routes.map(route => completion(next, route, route.profile === 'efficient' ? efficientOptions : {}));
  const bounds = {
    envelope: completion(next, frontier, efficientOptions),
    purchasedContinuously: completion(next, frontier, {unlimited:true})
  };
  return {early, late, next, before, after, bounds, routes};
}

if (require.main === module) {
  const readMeasurements = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const [primaryFile, ...alternatives] = process.argv.slice(2).filter(arg => arg !== '--calibrate');
  const measurements = new Map();
  for (const sample of [primaryFile,...alternatives].flatMap(readMeasurements)) {
    const key = [sample.classId,sample.profile,sample.level,sample.area].join(':');
    if ((measurements.get(key)?.seconds ?? 0) < sample.seconds) measurements.set(key, sample);
  }
  const result = project([...measurements.values()], levels.xpNeeded, process.argv.includes('--calibrate'));
  console.log(JSON.stringify(result));
}
module.exports = {project,makeRoutes};
