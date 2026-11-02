-- Preserve exact path results while rejecting a disconnected final node locally.
-- Never rewrite previously applied migrations or unknown map versions.
UPDATE mare_game.character_world SET rules_hash='6677e2ee6b208c4f1249f5373942fd3c1aaef8dd4bef26f339891254d85c0b0a' WHERE rules_hash='42b516c22a9ee917dd6409171adb55784a144fd87a50caa16c99e45be7e67d08';
