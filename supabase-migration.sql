-- Baba Lets: rodar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS baba_participants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS baba_votes (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES baba_participants(id) ON DELETE CASCADE,
  voted_for_id INTEGER NOT NULL REFERENCES baba_participants(id) ON DELETE CASCADE,
  pote INTEGER NOT NULL CHECK (pote BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, voted_for_id),
  CHECK (voter_id != voted_for_id)
);

CREATE TABLE IF NOT EXISTS baba_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE baba_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE baba_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE baba_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_read_participants" ON baba_participants FOR SELECT TO anon USING (true);
CREATE POLICY "allow_anon_read_settings" ON baba_settings FOR SELECT TO anon USING (true);

INSERT INTO baba_settings (key, value) VALUES
  ('results_revealed', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO baba_participants (name, pin) VALUES
  ('Rafael Silva', '4821'),
  ('Francisco Neto', '7356'),
  ('Victor Moura', '2914'),
  ('Igor', '6037'),
  ('Pedro', '8452'),
  ('Marcos Lima', '3198'),
  ('Melo', '5673'),
  ('Micael', '9241'),
  ('Danilo', '1587'),
  ('Yan', '6894'),
  ('Medeiros', '3720'),
  ('Thiago', '8163'),
  ('Wesley', '4509'),
  ('Robson', '7285'),
  ('Temóteo', '2641'),
  ('Matheus', '9378'),
  ('Denisson', '5042'),
  ('Hugo', '8716'),
  ('Regis', '3859'),
  ('Thiago Wesley', '7124'),
  ('Pedro Carneiro', '6493'),
  ('Vinícius', '1837'),
  ('Juan', '4962')
ON CONFLICT DO NOTHING;
