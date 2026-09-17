-- Migration: escopa votos por rodada (round_id em votes e vote_history)
-- Rodar no Supabase SQL Editor

-- 1. Adiciona round_id na tabela votes (nullable para não quebrar dados existentes)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE;

-- 2. Troca unique constraint de (voter_id, votee_id) para (round_id, voter_id, votee_id)
--    Permite que o mesmo par vote/votado apareça em rodadas diferentes
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_id_votee_id_key;
ALTER TABLE votes ADD CONSTRAINT IF NOT EXISTS votes_round_voter_votee_key
  UNIQUE (round_id, voter_id, votee_id);

-- 3. Cria tabela vote_history se ainda não existir
CREATE TABLE IF NOT EXISTS vote_history (
  id         SERIAL PRIMARY KEY,
  round_id   INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
  voter_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
  votee_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
  pote       INTEGER NOT NULL CHECK (pote BETWEEN 1 AND 6),
  points     INTEGER NOT NULL CHECK (points > 0),
  prev_pote  INTEGER,
  prev_points INTEGER,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilita RLS em vote_history
ALTER TABLE vote_history ENABLE ROW LEVEL SECURITY;
