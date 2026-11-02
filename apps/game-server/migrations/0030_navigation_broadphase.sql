-- Exact geometry is unchanged; only collision candidate lookup is indexed.
-- Only the verified preceding map version is upgraded. Unknown maps fail closed.
UPDATE mare_game.character_world SET rules_hash='42b516c22a9ee917dd6409171adb55784a144fd87a50caa16c99e45be7e67d08' WHERE rules_hash='76e9e8b995af3a5fcdbd12e34a8d4b280ac276c95e59f3e42e0a81a4825806b5';
