-- Persistent groups, separate from temporary Parties and from individual progression.
CREATE TABLE mare_game.crews (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 32),
  name_key text NOT NULL UNIQUE CHECK (char_length(name_key) BETWEEN 3 AND 96),
  tag text NOT NULL UNIQUE CHECK (tag ~ '^[A-Z0-9]{2,6}$'),
  flag text NOT NULL CHECK (char_length(flag)=1024 AND flag !~ '[^0-9a-f]' AND flag ~ '[1-9a-f]'),
  captain_id uuid NOT NULL REFERENCES mare_game.characters(id),
  policy text NOT NULL CHECK (policy IN ('open','approval')),
  min_level integer NOT NULL CHECK (min_level BETWEEN 1 AND 100000),
  xp bigint NOT NULL DEFAULT 0 CHECK (xp BETWEEN 0 AND 9007199254740991),
  treasury bigint NOT NULL DEFAULT 0 CHECK (treasury BETWEEN 0 AND 9007199254740991),
  facilities jsonb NOT NULL DEFAULT '{"hull":1,"infirmary":1,"galley":1,"command":1,"workshop":1,"navigation":1,"warehouse":1}',
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  dissolved_at timestamptz,
  CHECK (jsonb_typeof(facilities)='object' AND facilities ?& ARRAY['hull','infirmary','galley','command','workshop','navigation','warehouse']
    AND facilities - ARRAY['hull','infirmary','galley','command','workshop','navigation','warehouse']='{}'::jsonb
    AND facilities->>'hull' ~ '^[1-5]$' AND facilities->>'infirmary' ~ '^[1-5]$'
    AND facilities->>'galley' ~ '^[1-5]$' AND facilities->>'command' ~ '^[1-5]$'
    AND facilities->>'workshop' ~ '^[1-5]$' AND facilities->>'navigation' ~ '^[1-5]$'
    AND facilities->>'warehouse' ~ '^[1-5]$')
);

CREATE FUNCTION mare_game.keep_crew_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.name, OLD.name_key, OLD.tag, OLD.flag) IS DISTINCT FROM (NEW.name, NEW.name_key, NEW.tag, NEW.flag) THEN
    RAISE EXCEPTION 'crew_identity_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER keep_crew_identity BEFORE UPDATE ON mare_game.crews
FOR EACH ROW EXECUTE FUNCTION mare_game.keep_crew_identity();

CREATE TABLE mare_game.crew_members (
  character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
  crew_id uuid NOT NULL REFERENCES mare_game.crews(id),
  role text NOT NULL CHECK (role IN ('captain','officer','member')),
  joined_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);
CREATE INDEX crew_members_roster ON mare_game.crew_members(crew_id,joined_at);
CREATE UNIQUE INDEX crew_one_captain ON mare_game.crew_members(crew_id) WHERE role='captain';

CREATE TABLE mare_game.crew_entry_blocks (
  character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
  until_at timestamptz NOT NULL
);

CREATE TABLE mare_game.crew_requests (
  id uuid PRIMARY KEY,
  crew_id uuid NOT NULL REFERENCES mare_game.crews(id),
  character_id uuid NOT NULL REFERENCES mare_game.characters(id),
  sender_id uuid NOT NULL REFERENCES mare_game.characters(id),
  kind text NOT NULL CHECK (kind IN ('invitation','application')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at>created_at)
);
CREATE UNIQUE INDEX crew_requests_pending ON mare_game.crew_requests(crew_id,character_id,kind) WHERE status='pending';
CREATE INDEX crew_requests_inbox ON mare_game.crew_requests(character_id,expires_at) WHERE status='pending';

CREATE TABLE mare_game.crew_ledger (
  crew_id uuid NOT NULL REFERENCES mare_game.crews(id),
  character_id uuid NOT NULL REFERENCES mare_game.characters(id),
  request_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('donation','upgrade')),
  amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 9007199254740991),
  facility text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (character_id,request_id),
  FOREIGN KEY(character_id,request_id) REFERENCES mare_game.character_commands(character_id,request_id) DEFERRABLE INITIALLY DEFERRED,
  CHECK ((kind='donation' AND facility IS NULL) OR
    (kind='upgrade' AND facility IS NOT NULL AND facility IN ('hull','infirmary','galley','command','workshop','navigation','warehouse')))
);
CREATE INDEX crew_ledger_history ON mare_game.crew_ledger(crew_id,created_at DESC);
CREATE INDEX crew_ledger_quota ON mare_game.crew_ledger(character_id,created_at) WHERE kind='donation';

CREATE TABLE mare_game.crew_missions (
  id uuid PRIMARY KEY,
  crew_id uuid NOT NULL REFERENCES mare_game.crews(id),
  cycle integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('kills','bosses','donations','sea-war')),
  capacity integer NOT NULL CHECK (capacity IN (12,16,20,25,30)),
  target integer NOT NULL CHECK (target>0),
  progress integer NOT NULL DEFAULT 0 CHECK (progress>=0 AND progress<=target),
  reward_xp integer NOT NULL CHECK (reward_xp>0),
  completed_at timestamptz,
  UNIQUE (crew_id,cycle,kind),
  CHECK ((completed_at IS NULL) = (progress<target))
);

CREATE TABLE mare_game.crew_activity_events (
  crew_id uuid NOT NULL REFERENCES mare_game.crews(id),
  character_id uuid NOT NULL REFERENCES mare_game.characters(id),
  kind text NOT NULL CHECK (kind IN ('kills','bosses','donations')),
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 1 AND 200),
  mission_id uuid NOT NULL REFERENCES mare_game.crew_missions(id),
  PRIMARY KEY (character_id,kind,event_id),
  UNIQUE (crew_id,kind,event_id)
);

REVOKE ALL ON mare_game.crews,mare_game.crew_members,mare_game.crew_entry_blocks,mare_game.crew_requests,
  mare_game.crew_ledger,mare_game.crew_missions,mare_game.crew_activity_events FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
    GRANT SELECT ON mare_game.crews,mare_game.crew_members,mare_game.crew_entry_blocks,mare_game.crew_requests,
      mare_game.crew_ledger,mare_game.crew_missions,mare_game.crew_activity_events TO mare_runtime;
    GRANT INSERT(id,name,name_key,tag,flag,captain_id,policy,min_level),UPDATE(captain_id,policy,min_level,xp,treasury,facilities,dissolved_at) ON mare_game.crews TO mare_runtime;
    GRANT INSERT(character_id,crew_id,role,joined_at),UPDATE(role),DELETE ON mare_game.crew_members TO mare_runtime;
    GRANT INSERT(character_id,until_at),UPDATE(until_at) ON mare_game.crew_entry_blocks TO mare_runtime;
    GRANT INSERT(id,crew_id,character_id,sender_id,kind,expires_at),UPDATE(status) ON mare_game.crew_requests TO mare_runtime;
    GRANT INSERT(crew_id,character_id,request_id,kind,amount,facility,created_at) ON mare_game.crew_ledger TO mare_runtime;
    GRANT INSERT(id,crew_id,cycle,kind,capacity,target,reward_xp),UPDATE(progress,completed_at) ON mare_game.crew_missions TO mare_runtime;
    GRANT INSERT(crew_id,character_id,kind,event_id,mission_id) ON mare_game.crew_activity_events TO mare_runtime;
  END IF;
END
$$;
