CREATE TABLE mare_game.item_catalog (
 item_id text PRIMARY KEY, catalog_id text NOT NULL DEFAULT 'online-items-v1' CHECK(catalog_id='online-items-v1'),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),slot text NOT NULL CHECK(slot IN ('material','weapon','armor')),
 buy_price integer NOT NULL CHECK(buy_price BETWEEN 1 AND 100000),sell_price integer NOT NULL CHECK(sell_price BETWEEN 1 AND buy_price),
 attack_bonus smallint NOT NULL DEFAULT 0 CHECK(attack_bonus BETWEEN 0 AND 4),hp_bonus smallint NOT NULL DEFAULT 0 CHECK(hp_bonus BETWEEN 0 AND 16),
 armor_bonus smallint NOT NULL DEFAULT 0 CHECK(armor_bonus BETWEEN 0 AND 2),UNIQUE(item_id,slot)
);
INSERT INTO mare_game.item_catalog(item_id,name,slot,buy_price,sell_price,attack_bonus,hp_bonus,armor_bonus) VALUES
 ('dock-scrap-v1','Fragmento de metal','material',2,1,0,0,0),
 ('training-weapon-v1','Instrumento de treino','weapon',30,10,2,0,0),
 ('dock-vest-v1','Colete do cais','armor',24,8,0,8,1);
CREATE TABLE mare_game.character_inventory (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 item_id text NOT NULL REFERENCES mare_game.item_catalog(item_id) ON DELETE RESTRICT,
 quantity integer NOT NULL CHECK(quantity BETWEEN 0 AND 100000),PRIMARY KEY(character_id,item_id)
);
CREATE TABLE mare_game.character_equipment (
 character_id uuid NOT NULL,slot text NOT NULL CHECK(slot IN ('weapon','armor')),item_id text NOT NULL,
 PRIMARY KEY(character_id,slot),FOREIGN KEY(character_id,item_id) REFERENCES mare_game.character_inventory(character_id,item_id) ON DELETE RESTRICT,
 FOREIGN KEY(item_id,slot) REFERENCES mare_game.item_catalog(item_id,slot) ON DELETE RESTRICT
);
CREATE TABLE mare_game.inventory_ledger (
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,request_id uuid NOT NULL,
 event text NOT NULL CHECK(event IN ('buy','sell','drop','equip','unequip')),
 item_id text NOT NULL REFERENCES mare_game.item_catalog(item_id) ON DELETE RESTRICT,
 previous_item_id text REFERENCES mare_game.item_catalog(item_id) ON DELETE RESTRICT,
 encounter_id uuid,version_before bigint NOT NULL CHECK(version_before BETWEEN 0 AND 9007199254740990),
 quantity_before integer NOT NULL CHECK(quantity_before BETWEEN 0 AND 100000),quantity_delta integer NOT NULL CHECK(quantity_delta BETWEEN -100 AND 100),
 quantity_after integer GENERATED ALWAYS AS (quantity_before+quantity_delta) STORED CHECK(quantity_after BETWEEN 0 AND 100000),
 gold_before bigint NOT NULL CHECK(gold_before>=0),gold_delta bigint NOT NULL,
 gold_after bigint GENERATED ALWAYS AS (gold_before+gold_delta) STORED CHECK(gold_after>=0),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(character_id,request_id),UNIQUE(character_id,encounter_id),
 CHECK((event='drop')=(encounter_id IS NOT NULL)),
 CHECK((event='buy' AND quantity_delta>0 AND gold_delta<0) OR (event='sell' AND quantity_delta<0 AND gold_delta>0)
  OR (event='drop' AND quantity_delta=1 AND gold_delta=0) OR (event IN ('equip','unequip') AND quantity_delta=0 AND gold_delta=0)),
 FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(character_id,encounter_id) REFERENCES mare_game.combat_rewards(character_id,encounter_id) DEFERRABLE INITIALLY DEFERRED
);
REVOKE ALL ON mare_game.item_catalog,mare_game.character_inventory,mare_game.character_equipment,mare_game.inventory_ledger FROM PUBLIC;
CREATE INDEX inventory_ledger_latest ON mare_game.inventory_ledger(character_id,version_before DESC);
