-- Social relationships and messages are independent of combat, groups and inventory.
CREATE TABLE mare_game.social_friend_requests (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES mare_game.characters(id),
  target_id uuid NOT NULL REFERENCES mare_game.characters(id),
  character_low uuid GENERATED ALWAYS AS (least(sender_id,target_id)) STORED,
  character_high uuid GENERATED ALWAYS AS (greatest(sender_id,target_id)) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','removed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (sender_id<>target_id)
);
CREATE UNIQUE INDEX social_friend_pair_active ON mare_game.social_friend_requests(character_low,character_high)
  WHERE status IN ('pending','accepted');
CREATE INDEX social_friend_sender ON mare_game.social_friend_requests(sender_id,created_at DESC);
CREATE INDEX social_friend_target ON mare_game.social_friend_requests(target_id,created_at DESC)
  WHERE status IN ('pending','accepted');

CREATE TABLE mare_game.social_contact_blocks (
  blocker_id uuid NOT NULL REFERENCES mare_game.characters(id),
  target_id uuid NOT NULL REFERENCES mare_game.characters(id),
  PRIMARY KEY(blocker_id,target_id),
  CHECK (blocker_id<>target_id)
);
CREATE INDEX social_contact_blocks_target ON mare_game.social_contact_blocks(target_id,blocker_id);

CREATE TABLE mare_game.social_presence (
  character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
  control_epoch bigint NOT NULL CHECK (control_epoch>0),
  last_seen timestamptz NOT NULL
);

CREATE TABLE mare_game.social_conversations (
  character_low uuid NOT NULL REFERENCES mare_game.characters(id),
  character_high uuid NOT NULL REFERENCES mare_game.characters(id),
  low_read_through bigint NOT NULL DEFAULT 0 CHECK (low_read_through>=0),
  high_read_through bigint NOT NULL DEFAULT 0 CHECK (high_read_through>=0),
  PRIMARY KEY(character_low,character_high),
  CHECK(character_low<character_high)
);
CREATE INDEX social_conversations_high ON mare_game.social_conversations(character_high);

CREATE TABLE mare_game.social_private_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  character_low uuid NOT NULL,
  character_high uuid NOT NULL,
  sender_id uuid NOT NULL,
  request_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500 AND char_length(btrim(body))>0),
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(character_low,character_high) REFERENCES mare_game.social_conversations(character_low,character_high),
  FOREIGN KEY(sender_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE(sender_id,request_id),
  CHECK (sender_id IN (character_low,character_high))
);
CREATE INDEX social_messages_conversation ON mare_game.social_private_messages(character_low,character_high,id DESC);
CREATE INDEX social_messages_sender ON mare_game.social_private_messages(sender_id,sent_at DESC);

REVOKE ALL ON mare_game.social_friend_requests,mare_game.social_contact_blocks,mare_game.social_presence,
  mare_game.social_conversations,mare_game.social_private_messages FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
    GRANT SELECT ON mare_game.social_friend_requests,mare_game.social_contact_blocks,mare_game.social_presence,
      mare_game.social_conversations,mare_game.social_private_messages TO mare_runtime;
    GRANT INSERT(id,sender_id,target_id),UPDATE(status) ON mare_game.social_friend_requests TO mare_runtime;
    GRANT INSERT(blocker_id,target_id),DELETE ON mare_game.social_contact_blocks TO mare_runtime;
    GRANT INSERT(character_id,control_epoch,last_seen),UPDATE(control_epoch,last_seen) ON mare_game.social_presence TO mare_runtime;
    GRANT INSERT(character_low,character_high),UPDATE(low_read_through,high_read_through) ON mare_game.social_conversations TO mare_runtime;
    GRANT INSERT(character_low,character_high,sender_id,request_id,body) ON mare_game.social_private_messages TO mare_runtime;
  END IF;
END
$$;
