-- Baba Lets v2 — rodar no Supabase SQL Editor
-- Limpa schema v1 e cria estrutura v2 do zero

-- ─── DROP ANTIGAS ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS baba_votes CASCADE;
DROP TABLE IF EXISTS baba_participants CASCADE;
DROP TABLE IF EXISTS round_teams CASCADE;
DROP TABLE IF EXISTS round_pots CASCADE;
DROP TABLE IF EXISTS round_participants CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP VIEW IF EXISTS player_ranking CASCADE;

-- ─── JOGADORES ───────────────────────────────────────────────────────────────
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VOTOS ───────────────────────────────────────────────────────────────────
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  votee_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pote INTEGER NOT NULL CHECK (pote BETWEEN 1 AND 6),
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, votee_id),
  CHECK (voter_id != votee_id)
);

-- ─── RODADAS ─────────────────────────────────────────────────────────────────
CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','drawn')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PARTICIPANTES DA RODADA ─────────────────────────────────────────────────
-- Os 18 confirmados por rodada; novatos recebem pote manual do admin
CREATE TABLE round_participants (
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_novice BOOLEAN DEFAULT FALSE,
  manual_pote INTEGER CHECK (manual_pote BETWEEN 1 AND 6),
  PRIMARY KEY (round_id, player_id)
);

-- ─── POTES DA RODADA (resultado do algoritmo) ────────────────────────────────
CREATE TABLE round_pots (
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pote INTEGER NOT NULL CHECK (pote BETWEEN 1 AND 6),
  PRIMARY KEY (round_id, player_id)
);

-- ─── TIMES SORTEADOS ─────────────────────────────────────────────────────────
CREATE TABLE round_teams (
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team INTEGER NOT NULL CHECK (team BETWEEN 1 AND 3),
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pote INTEGER NOT NULL CHECK (pote BETWEEN 1 AND 6),
  PRIMARY KEY (round_id, player_id)
);

-- ─── CONFIGURAÇÕES GLOBAIS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baba_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE baba_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública para telas abertas
CREATE POLICY "anon_read_players"           ON players           FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_rounds"            ON rounds            FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_round_pots"        ON round_pots        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_round_teams"       ON round_teams       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_settings"          ON baba_settings     FOR SELECT TO anon USING (true);

-- ─── VIEW: RANKING ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW player_ranking AS
SELECT
  p.id,
  p.name,
  p.active,
  COALESCE(SUM(v.points), 0)::INTEGER                          AS total_points,
  COALESCE(COUNT(v.id), 0)::INTEGER                            AS vote_count,
  CASE
    WHEN COUNT(v.id) > 0
    THEN ROUND((SUM(v.points)::NUMERIC / COUNT(v.id)), 2)
    ELSE 0
  END                                                          AS ranking_index
FROM players p
LEFT JOIN votes v ON v.votee_id = p.id
GROUP BY p.id, p.name, p.active
ORDER BY ranking_index DESC, vote_count DESC, p.name ASC;

-- ─── SEED SETTINGS ───────────────────────────────────────────────────────────
INSERT INTO baba_settings (key, value) VALUES
  ('results_revealed', 'false'),
  ('active_round_id', '')
ON CONFLICT (key) DO NOTHING;

-- ─── SEED JOGADORES (mesmos da v1) ───────────────────────────────────────────
INSERT INTO players (name) VALUES
  ('Rafael Silva'), ('Francisco Neto'), ('Victor Moura'), ('Igor'), ('Pedro'),
  ('Marcos Lima'), ('Melo'), ('Micael'), ('Danilo'), ('Yan'), ('Medeiros'),
  ('Thiago'), ('Wesley'), ('Robson'), ('Temóteo'), ('Matheus'), ('Denisson'),
  ('Hugo'), ('Regis'), ('Thiago Wesley'), ('Pedro Carneiro'), ('Vinícius'), ('Juan')
ON CONFLICT DO NOTHING;
