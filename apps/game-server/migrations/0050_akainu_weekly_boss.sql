-- Dormant event infrastructure. No operator, occurrence, spawn or reward is enabled.
CREATE TABLE mare_game.weekly_boss_operators (
 account_id uuid PRIMARY KEY REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
 slot smallint NOT NULL UNIQUE CHECK(slot IN (1,2)),
 granted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE mare_game.weekly_boss_settings (
 boss_id text PRIMARY KEY CHECK(boss_id='akainu'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 config jsonb CHECK(config IS NULL OR jsonb_typeof(config)='object')
);
INSERT INTO mare_game.weekly_boss_settings(boss_id) VALUES('akainu');
CREATE TABLE mare_game.weekly_boss_events (
 id uuid PRIMARY KEY,
 boss_id text NOT NULL DEFAULT 'akainu' CHECK(boss_id='akainu'),
 mode text NOT NULL CHECK(mode IN ('official','test')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','cancelled','expired')),
 map_id text NOT NULL,
 cycle_key date NOT NULL,
 config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),
 simulation jsonb NOT NULL CHECK(jsonb_typeof(simulation)='object'),
 created_by uuid NOT NULL REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
 opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 closes_at timestamptz NOT NULL,
 tick_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ended_at timestamptz,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(mode='test' OR map_id='marineford'),
 CHECK(closes_at>opened_at),
 CHECK((status='active')=(ended_at IS NULL)),
 UNIQUE(id,mode), UNIQUE(id,cycle_key)
);
CREATE UNIQUE INDEX weekly_boss_single_live ON mare_game.weekly_boss_events(boss_id,mode) WHERE status='active';
CREATE INDEX weekly_boss_tick ON mare_game.weekly_boss_events(tick_at) WHERE status='active';
CREATE TABLE mare_game.weekly_boss_members (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 event_id uuid NOT NULL REFERENCES mare_game.weekly_boss_events(id) ON DELETE RESTRICT,
 last_seen timestamptz NOT NULL DEFAULT clock_timestamp(),
 control_epoch bigint NOT NULL CHECK(control_epoch>0),
 return_world jsonb NOT NULL,
 return_battle jsonb NOT NULL
);
CREATE INDEX weekly_boss_roster ON mare_game.weekly_boss_members(event_id,character_id);
CREATE TABLE mare_game.weekly_boss_victories (
 event_id uuid NOT NULL,
 character_id uuid NOT NULL REFERENCES mare_game.characters(id) ON DELETE RESTRICT,
 mode text NOT NULL DEFAULT 'official' CHECK(mode='official'),
 damage double precision NOT NULL CHECK(damage>=0),
 healing double precision NOT NULL CHECK(healing>=0),
 combat_ms double precision NOT NULL CHECK(combat_ms>=0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,character_id),
 FOREIGN KEY(event_id,mode) REFERENCES mare_game.weekly_boss_events(id,mode) ON DELETE RESTRICT
);
CREATE TABLE mare_game.weekly_boss_entitlements (
 character_id uuid NOT NULL,
 boss_id text NOT NULL DEFAULT 'akainu' CHECK(boss_id='akainu'),
 cycle_key date NOT NULL,
 event_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending_configuration' CHECK(status='pending_configuration'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(character_id,boss_id,cycle_key),
 FOREIGN KEY(event_id,character_id) REFERENCES mare_game.weekly_boss_victories(event_id,character_id) ON DELETE RESTRICT,
 FOREIGN KEY(event_id,cycle_key) REFERENCES mare_game.weekly_boss_events(id,cycle_key) ON DELETE RESTRICT
);
CREATE TABLE mare_game.weekly_boss_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid REFERENCES mare_game.weekly_boss_events(id) ON DELETE RESTRICT,
 account_id uuid REFERENCES mare_game.accounts(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK(action IN ('configure','activate','test','cancel','won','expired')),
 detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON mare_game.weekly_boss_operators,mare_game.weekly_boss_settings,mare_game.weekly_boss_events,
 mare_game.weekly_boss_members,mare_game.weekly_boss_victories,mare_game.weekly_boss_entitlements,mare_game.weekly_boss_audit FROM PUBLIC;
-- Known predecessor only. No health, inventory, XP or historical receipt is rewritten.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('0e7aa4337d8e00807bf9491c2e2b46dc4b27be7863c3902c0f3569947d0475ee'::text)) WHERE simulation->>'rulesHash'='5fcaf57a6a7f3fd3489871528d4ba91a719a3c3851ffca11fad026deee9fb488';
