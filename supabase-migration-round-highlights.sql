-- Migration: tabela round_awards (votos de MVP e Pereba por rodada)
-- Rodar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS round_awards (
  round_id   INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mvp_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pereba_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (round_id, voter_id),
  CHECK (mvp_id != voter_id),
  CHECK (pereba_id != voter_id),
  CHECK (mvp_id != pereba_id)
);

ALTER TABLE round_awards ENABLE ROW LEVEL SECURITY;

-- Leitura pública (totais são exibidos para todos os participantes)
CREATE POLICY "anon_read_round_awards"
  ON round_awards FOR SELECT TO anon USING (true);
