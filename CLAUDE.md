# Baba Lets

Aplicativo de votação para montagem de times do "Baba" (pelada de futebol) da empresa. Participantes votam para distribuir 18 jogadores em 6 potes (3 por pote), e o admin revela o resultado final.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL + RLS)
- **Tailwind CSS** (sem biblioteca de componentes — tudo custom)
- **Vercel** (deploy + Analytics)

## Estrutura

```
app/
  page.tsx              # Login — seleção de nome
  votar/page.tsx        # Votação drag-and-drop (18 pessoas → 6 potes)
  resumo/page.tsx       # Confirmação + envio dos votos
  resultados/page.tsx   # Ranking por pote (liberado pelo admin)
  admin/page.tsx        # Dashboard admin (progresso + revelar resultado)
  api/
    login/              # Autentica participante
    participants/       # Lista todos os participantes
    votar/              # Salva votos, marca voter como has_voted
    resultados/         # Retorna resultado calculado (se revelado)
    admin/status/       # Progresso de votação (requer x-admin-password)
    admin/reveal/       # Toggle results_revealed
lib/
  supabase-server.ts    # Client Supabase (cache: no-store)
  types.ts              # TypeScript types compartilhados
supabase-migration.sql  # Schema completo do banco
```

## Banco de dados (Supabase)

- **baba_participants** — 23 participantes pré-cadastrados com `has_voted`
- **baba_votes** — `voter_id`, `voted_for_id`, `pote` (1-6); UNIQUE(voter_id, voted_for_id)
- **baba_settings** — chave/valor; `results_revealed = 'true'|'false'`

RLS habilitado em todas as tabelas; rotas de API usam `SUPABASE_SERVICE_ROLE_KEY`.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

## Estado do cliente

`sessionStorage`:
- `baba_voter_id` — ID do participante logado
- `baba_voter_name` — nome do participante
- `baba_votes` — array de votos antes de confirmar

## Algoritmo de resultado (greedy draft)

Em `/resultados`, os votos são agregados por `(pessoa, pote)` e um draft guloso atribui cada pessoa ao pote com mais votos, respeitando o limite de 3 por pote. Empates são desempatados por número do pote (pote 1 > pote 6).

## Padrões importantes

- Todas as rotas de API têm `export const dynamic = 'force-dynamic'` e headers `Cache-Control: no-store` para evitar cache do Vercel Edge.
- O client Supabase em `lib/supabase-server.ts` usa `cache: 'no-store'` no fetch.
- Sem autenticação formal — login é só por seleção de nome (sem PIN ativo).
- Admin autenticado via header `x-admin-password` ou cookie de sessão local.

## Git / Deploy

- **Branch principal**: `master`
- **GitHub user**: `vvictormelo`
- **Deploy**: Vercel (automático no push para `master`)
- **GitHub CLI**: usar conta `vvictormelo` (`gh auth switch --user vvictormelo`)

## Comandos úteis

```bash
npm run dev          # dev local (http://localhost:3000)
npm run build        # build de produção
npm run lint         # ESLint
```
