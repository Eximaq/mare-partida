const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../hierarchy-system.js');

test('títulos e requisitos das quatro facções',()=>{
  for(const faction of Object.keys(H.titles)){
    assert.equal(H.titles[faction].length,8);
    assert.equal(H.next(1,19).state,'level');
    assert.equal(H.next(1,20).state,'ready');
    assert.equal(H.next(4,100).state,'ready');
    assert.equal(H.next(5,200).state,'locked');
    assert.equal(H.next(5,200).message,H.lockedMessage);
  }
});

test('migração preserva cargo e reinicia ao mudar facção',()=>{
  const game={factionId:'pirate',hierarchyFaction:'pirate',hierarchyTier:4};
  H.migrate(game);assert.equal(game.hierarchyTier,4);
  game.factionId='marine';H.migrate(game);assert.equal(game.hierarchyTier,1);
});

test('ranking global desempata por patamar, nível e poder',()=>{
  const players=[
    {player_id:'a',faction:'pirate',tier:2,level:20,power:100},
    {player_id:'b',faction:'pirate',tier:1,level:200,power:999},
    {player_id:'c',faction:'pirate',tier:2,level:20,power:110},
    {player_id:'d',faction:'pirate',tier:2,level:21,power:1},
    {player_id:'x',faction:'marine',tier:8,level:200,power:999}
  ];
  assert.deepEqual(H.ranking(players).map(p=>p.player_id),['x','d','c','a','b']);
});
