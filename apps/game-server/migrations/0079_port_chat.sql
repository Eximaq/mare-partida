CREATE TABLE mare_game.port_chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES mare_game.characters(id),
  request_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 140 AND btrim(body)<>''),
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (sender_id,request_id)
);
CREATE INDEX port_chat_sender_time ON mare_game.port_chat_messages(sender_id,sent_at DESC);
REVOKE ALL ON mare_game.port_chat_messages FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mare_runtime') THEN
    GRANT SELECT,INSERT(sender_id,request_id,body) ON mare_game.port_chat_messages TO mare_runtime;
  END IF;
END $$;
