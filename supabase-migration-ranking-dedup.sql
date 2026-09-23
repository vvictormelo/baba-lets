-- Migration: player_ranking passa a considerar apenas o voto mais recente
-- de cada par votante -> votado.
-- Rodar no Supabase SQL Editor.
--
-- CONTEXTO
-- A view somava todas as linhas de `votes`. Como cada rodada grava uma linha
-- nova por par, a mesma pessoa avaliando o mesmo jogador entrava N vezes na
-- media -- inclusive com a nota que ela propria ja havia substituido.
-- Em 22/09/2026: 675 linhas para 536 opinioes reais (139 duplicadas, 20,6%).
--
-- Isso viola a especificacao funcional:
--   §4  indice = soma dos pontos recebidos / quantidade de votos recebidos
--   §5  exemplo com 5 votantes = 5 votos
--   §12 "a media deve utilizar somente votos validos recebidos"
--
-- Nenhum voto e apagado. As linhas permanecem em `votes` como historico;
-- a view apenas para de conta-las mais de uma vez.

BEGIN;

CREATE OR REPLACE VIEW player_ranking AS
WITH latest_votes AS (
  SELECT DISTINCT ON (v.voter_id, v.votee_id)
         v.voter_id, v.votee_id, v.points
  FROM votes v
  ORDER BY v.voter_id, v.votee_id, v.round_id DESC NULLS LAST, v.id DESC
)
 SELECT p.id, p.name, p.active, p.is_novice, p.is_goalkeeper,
    COALESCE(sum(lv.points), 0::bigint)::integer AS total_points,
    COALESCE(count(lv.votee_id), 0::bigint)::integer AS vote_count,
        CASE WHEN count(lv.votee_id) > 0
             THEN round(sum(lv.points)::numeric / count(lv.votee_id)::numeric, 2)
             ELSE 0::numeric END AS ranking_index
   FROM players p
     LEFT JOIN latest_votes lv ON lv.votee_id = p.id
  GROUP BY p.id, p.name, p.active, p.is_novice, p.is_goalkeeper
  ORDER BY (CASE WHEN count(lv.votee_id) > 0
                 THEN round(sum(lv.points)::numeric / count(lv.votee_id)::numeric, 2)
                 ELSE 0::numeric END) DESC,
           (COALESCE(count(lv.votee_id), 0::bigint)::integer) DESC, p.name;

-- Verificacao: esperado Wesley Motopier com vote_count 18 e ranking_index 17.67
-- (antes da deduplicacao: 24 e 17.75)
SELECT name, total_points, vote_count, ranking_index
FROM player_ranking WHERE active ORDER BY ranking_index DESC LIMIT 5;

COMMIT;


-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- Definicao anterior, transcrita de pg_get_viewdef em 22/09/2026.
-- Rodar apenas para desfazer.
--
-- CREATE OR REPLACE VIEW player_ranking AS
--  SELECT p.id, p.name, p.active, p.is_novice, p.is_goalkeeper,
--     COALESCE(sum(v.points), 0::bigint)::integer AS total_points,
--     COALESCE(count(v.id), 0::bigint)::integer AS vote_count,
--         CASE WHEN count(v.id) > 0
--              THEN round(sum(v.points)::numeric / count(v.id)::numeric, 2)
--              ELSE 0::numeric END AS ranking_index
--    FROM players p
--      LEFT JOIN votes v ON v.votee_id = p.id
--   GROUP BY p.id, p.name, p.active, p.is_novice, p.is_goalkeeper
--   ORDER BY (CASE WHEN count(v.id) > 0
--                  THEN round(sum(v.points)::numeric / count(v.id)::numeric, 2)
--                  ELSE 0::numeric END) DESC,
--            (COALESCE(count(v.id), 0::bigint)::integer) DESC, p.name;
