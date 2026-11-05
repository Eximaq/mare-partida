-- A profession belongs to the character; changing crews has no effect on this ledger.
CREATE TABLE mare_game.character_professions (
 character_id uuid PRIMARY KEY REFERENCES mare_game.characters(id),
 profession text NOT NULL CHECK(profession IN ('doctor','command','cook','carpenter','navigator')),
 experience integer NOT NULL DEFAULT 0 CHECK(experience BETWEEN 0 AND 10800),
 chosen_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);
CREATE TABLE mare_game.profession_weeks (
 character_id uuid NOT NULL REFERENCES mare_game.character_professions(character_id),
 week_start date NOT NULL,
 issued_at timestamptz NOT NULL,
 spec jsonb NOT NULL CHECK(jsonb_typeof(spec)='object'),
 progress jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(progress)='object'),
 material_count integer NOT NULL DEFAULT 0 CHECK(material_count>=0),
 PRIMARY KEY(character_id,week_start)
);
CREATE TABLE mare_game.profession_events (
 character_id uuid NOT NULL,
 week_start date NOT NULL,
 kind text NOT NULL CHECK(kind IN ('kill','donation','prison','weekly-boss')),
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 128),
 PRIMARY KEY(character_id,kind,event_id),
 FOREIGN KEY(character_id,week_start) REFERENCES mare_game.profession_weeks(character_id,week_start)
);
CREATE TABLE mare_game.profession_xp (
 character_id uuid NOT NULL,
 week_start date NOT NULL,
 objective text NOT NULL CHECK(objective IN ('donation','hunt','collection','prison','boss')),
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 1000),
 credited_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 PRIMARY KEY(character_id,week_start,objective),
 FOREIGN KEY(character_id,week_start) REFERENCES mare_game.profession_weeks(character_id,week_start)
);
REVOKE ALL ON mare_game.character_professions,mare_game.profession_weeks,mare_game.profession_events,mare_game.profession_xp FROM PUBLIC;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
  GRANT SELECT ON mare_game.character_professions,mare_game.profession_weeks,mare_game.profession_events,mare_game.profession_xp TO mare_runtime;
  GRANT INSERT (character_id,profession) ON mare_game.character_professions TO mare_runtime;
  GRANT UPDATE (experience) ON mare_game.character_professions TO mare_runtime;
  GRANT INSERT (character_id,week_start,issued_at,spec), UPDATE (progress,material_count) ON mare_game.profession_weeks TO mare_runtime;
  GRANT INSERT (character_id,week_start,kind,event_id) ON mare_game.profession_events TO mare_runtime;
  GRANT INSERT (character_id,week_start,objective,amount) ON mare_game.profession_xp TO mare_runtime;
 END IF;
END
$$;
