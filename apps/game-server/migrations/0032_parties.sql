-- Cooperative state is independent of crews and personal dungeon rewards.
CREATE TABLE mare_game.parties(id uuid PRIMARY KEY, leader_id uuid NOT NULL REFERENCES mare_game.characters(id), preparation jsonb, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE mare_game.party_members(character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),party_id uuid NOT NULL REFERENCES mare_game.parties(id),joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_seen timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX party_members_group ON mare_game.party_members(party_id);
CREATE TABLE mare_game.party_invites(id uuid PRIMARY KEY,party_id uuid NOT NULL REFERENCES mare_game.parties(id),sender_id uuid NOT NULL REFERENCES mare_game.characters(id),target_id uuid NOT NULL REFERENCES mare_game.characters(id),expires_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired')),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE UNIQUE INDEX party_invite_pending ON mare_game.party_invites(party_id,target_id) WHERE status='pending';
CREATE INDEX party_invites_target ON mare_game.party_invites(target_id,expires_at);
CREATE TABLE mare_game.party_instances(id uuid PRIMARY KEY,party_id uuid NOT NULL REFERENCES mare_game.parties(id),simulation jsonb NOT NULL,tick_at timestamptz NOT NULL DEFAULT clock_timestamp(),ended_at timestamptz);
CREATE UNIQUE INDEX party_instance_active ON mare_game.party_instances(party_id) WHERE ended_at IS NULL;
CREATE TABLE mare_game.party_deaths(instance_id uuid NOT NULL REFERENCES mare_game.party_instances(id),spawn_id text NOT NULL,killer_id uuid NOT NULL REFERENCES mare_game.characters(id),PRIMARY KEY(instance_id,spawn_id));
CREATE TABLE mare_game.party_experience(instance_id uuid NOT NULL,spawn_id text NOT NULL,character_id uuid NOT NULL REFERENCES mare_game.characters(id),base_amount bigint NOT NULL CHECK(base_amount>=0),amount bigint NOT NULL CHECK(amount>=0),request_id uuid NOT NULL,PRIMARY KEY(instance_id,spawn_id,character_id),FOREIGN KEY(instance_id,spawn_id) REFERENCES mare_game.party_deaths(instance_id,spawn_id),FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED);

-- Advance only the audited predecessor; unknown rule sets remain fenced.
UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{rulesHash}',to_jsonb('6ca609c3086bf4062843ebd12d84fc75b5f0cad8307ce0d23454c92101d34e68'::text)) WHERE simulation->>'rulesHash'='d3f91ccf1599a03c2c1dc5d808d304a33ed17139c324ea632387137427c223a7';
