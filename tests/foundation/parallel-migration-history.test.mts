import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { pendingMigrations } from '../../apps/game-server/src/db/migrations.js';

const source = new URL('../../apps/game-server/migrations/', import.meta.url);
const plan = await Promise.all((await readdir(source)).filter(name => name.endsWith('.sql')).sort().map(async name => ({
  name, checksum: createHash('sha256').update((await readFile(new URL(name, source), 'utf8')).replaceAll('\r\n', '\n')).digest('hex'),
})));
const progressionNames = ['0067_world_progression.sql', '0068_dungeon_reward_catalog.sql', '0069_timed_progression.sql'];
const mapNames = [
  '0067_loguetown_hd_map.sql', '0068_arlong_park_hd_map.sql', '0069_baratie_hd_map.sql',
  '0070_syrup_hd_map.sql', '0071_rare_island_hd_map.sql', '0072_dawn_village_hd_map.sql',
  '0073_conchas_marine_hd_map.sql', '0074_orange_town_hd_map.sql', '0075_alabasta_desert_hd_map.sql',
  '0076_alubarna_city_hd_map.sql', '0077_boss_arena_hd_map.sql', '0078_marineford_hd_map.sql',
];
const cosmeticsName = '0079_character_cosmetics.sql';
const kairosekiName = '0080_account_kairoseki.sql';
const shopName = '0081_kairoseki_shop.sql';
const followupNames = [cosmeticsName, kairosekiName, shopName];
const common = plan.filter(row => row.name < '0067');
const rows = (names: string[]) => names.map(name => {
  const row = plan.find(row => row.name === name);
  assert.ok(row, name);
  return row;
});
const sorted = <T extends { name: string }>(values: T[]) => [...values].sort((a, b) => a.name.localeCompare(b.name));
const names = (values: { name: string }[]) => values.map(row => row.name);
const prHistory = sorted([...common, ...rows(mapNames)]);
const mainHistory = sorted([...common, ...rows(progressionNames)]);

test('deployed main and HD-map histories execute the missing branch and real follow-up SQL through every partial reconciliation', () => {
  assert.deepEqual(names(pendingMigrations(plan, mainHistory)), [...mapNames, ...followupNames]);
  assert.deepEqual(names(pendingMigrations(plan, prHistory)), [...progressionNames, ...followupNames]);
  assert.deepEqual(pendingMigrations(plan, []), plan);
  assert.deepEqual(pendingMigrations(plan, plan), []);
  for (let mapCount = 0; mapCount <= mapNames.length; mapCount++) {
    for (let progressionCount = 0; progressionCount <= progressionNames.length; progressionCount++) {
      const history = sorted([...common, ...rows(mapNames.slice(0, mapCount)), ...rows(progressionNames.slice(0, progressionCount))]);
      const expected = [...mapNames.slice(mapCount), ...progressionNames.slice(progressionCount), ...followupNames].sort();
      assert.deepEqual(names(pendingMigrations(plan, history)), expected, `maps=${mapCount}, progression=${progressionCount}`);
    }
  }
});

test('the cosmetics and Kairoseki follow-ups retain checksum and prefix validation', () => {
  const withoutFollowups = plan.filter(row => !followupNames.includes(row.name));
  assert.deepEqual(names(pendingMigrations(plan, withoutFollowups)), followupNames);
  assert.deepEqual(names(pendingMigrations(plan, [...withoutFollowups, ...rows([cosmeticsName])])), [kairosekiName,shopName]);
  assert.deepEqual(names(pendingMigrations(plan, [...withoutFollowups, ...rows([cosmeticsName,kairosekiName])])), [shopName]);
  assert.throws(() => pendingMigrations(plan, [...withoutFollowups, ...rows([kairosekiName])]), /Migration history mismatch/);
  assert.deepEqual(pendingMigrations(plan, plan), []);
  const prWithCosmetics = sorted([...prHistory, ...rows([cosmeticsName])]);
  assert.throws(() => pendingMigrations(plan, prWithCosmetics), /Migration history mismatch/, 'cosmetics cannot bypass unapplied progression migrations');
  assert.throws(() => pendingMigrations(plan, sorted([...mainHistory, ...rows([cosmeticsName])])), /Migration history mismatch/, 'cosmetics cannot bypass unapplied map migrations');
  for (const name of followupNames) {
    const changed = plan.map(row => row.name === name ? {...row, checksum:'changed-sql'} : row);
    assert.throws(() => pendingMigrations(plan, changed), /Migration history mismatch/);
  }
});

test('real geometry migration directories may contain only the first one or two audited collision pairs', () => {
  for (const count of [1, 2]) {
    const selectedProgression = progressionNames.slice(0, count);
    const partialPlan = sorted([...prHistory, ...rows(selectedProgression)]);
    assert.deepEqual(names(pendingMigrations(partialPlan, prHistory)), selectedProgression);
    assert.deepEqual(names(pendingMigrations(partialPlan, sorted([...common, ...rows(selectedProgression)]))), mapNames);
    assert.deepEqual(pendingMigrations(partialPlan, partialPlan), []);
  }
});

test('parallel release compatibility still rejects reordered, missing, unknown or changed migration history', () => {
  const invalidHistories = [
    mainHistory.filter(row => row.name !== '0068_dungeon_reward_catalog.sql'),
    prHistory.filter(row => row.name !== '0068_arlong_park_hd_map.sql'),
    prHistory.filter(row => row.name !== '0070_syrup_hd_map.sql'),
    mainHistory.filter(row => row.name !== '0066_skypiea_hd_arrival.sql'),
    prHistory.filter(row => row.name !== '0002_auth_sessions.sql'),
    [...mainHistory, mainHistory.at(-1)!],
    mainHistory.map(row => row.name === '0069_timed_progression.sql' ? { ...row, checksum: 'unknown' } : row),
    [...mainHistory, { name: '0070_unknown.sql', checksum: 'unknown' }],
    [...common, ...rows([...progressionNames].reverse())],
  ];
  for (const history of invalidHistories) assert.throws(() => pendingMigrations(plan, history), /Migration history mismatch/);
  const future = { name: '0082_following_release.sql', checksum: 'future' };
  assert.throws(() => pendingMigrations([...plan, future], [...prHistory, future]), /Migration history mismatch/);
  assert.deepEqual(pendingMigrations([...plan, future], [...plan, future]), []);
});

test('only the six exact audited SQL checksums may share the three release sequence numbers', () => {
  const auditedNames = [...mapNames.slice(0, 3), ...progressionNames];
  for (const changed of auditedNames) {
    const altered = plan.map(row => row.name === changed ? { ...row, checksum: 'rewritten-sql' } : row);
    assert.throws(() => pendingMigrations(altered, altered), /Migration history mismatch/, changed);
  }
  for (const extra of [
    { name: '0067_unreviewed_branch.sql', checksum: 'unknown' },
    { name: '0070_unreviewed_branch.sql', checksum: 'unknown' },
    rows(['0067_loguetown_hd_map.sql'])[0]!,
  ]) assert.throws(() => pendingMigrations(sorted([...plan, extra]), []), /Invalid migration filenames/);
});

test('the deployed Akainu name remains immutable while either parallel release is reconciled', () => {
  const canonical = plan.find(row => row.name === '0054_akainu_weekly_boss.sql')!;
  const historic = { ...canonical, name: '0050_akainu_weekly_boss.sql' };
  for (const [history, expected] of [[prHistory, progressionNames], [mainHistory, mapNames]] as const) {
    const legacy = sorted([...history.filter(row => row.name !== canonical.name), historic]);
    assert.deepEqual(names(pendingMigrations(plan, legacy)), [...expected, ...followupNames]);
    assert.throws(() => pendingMigrations(plan, legacy.map(row => row.name === historic.name ? { ...row, checksum: 'unknown' } : row)), /Migration history mismatch/);
    assert.throws(() => pendingMigrations(plan, sorted([...legacy, canonical])), /Migration history mismatch/);
  }
});
