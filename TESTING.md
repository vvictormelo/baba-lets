# Baba Lets v2 — O que foi feito e como testar

## Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL + RLS) — projeto `avleoyewravgyxxavyyi`
- **Tailwind CSS** — sem biblioteca de componentes
- **Vercel** — deploy automático no push para `master`

## Branches
- `master` — produção (Vercel)
- `hml` — homologação (sempre commitar aqui primeiro, merge para master após validação)

---

## Campos especiais nos jogadores

| Campo | Badge | Cor | Onde aparece |
|-------|-------|-----|--------------|
| `is_novice` | Novato | Laranja | `/votar`, `/admin/jogadores` |
| `is_goalkeeper` | Goleiro | Azul | `/votar`, `/admin/jogadores` |

Goleiros atuais: **João** e **Alexandre**.

---

## Como testar — fluxo completo

### 1. Votação (jogador)

1. Acesse `/` e selecione seu nome na lista
2. Você vai para `/votar` — lista todos os jogadores exceto você mesmo
3. Badges visíveis na lista:
   - **Novato** (laranja) — jogador marcado como novato pelo admin
   - **Goleiro** (azul) — jogador marcado como goleiro pelo admin
4. Clique nos botões `1`–`6` para atribuir pote a cada jogador (só quem você conhece — não precisa avaliar todos)
5. Clique **Salvar**
6. Vai para `/checkout` — resumo com indicador circular, votos por pote e não avaliados
7. **"Continuar avaliando"** volta para `/votar` com os votos carregados
8. **"Concluído →"** leva para `/painel`

**Validações:**
- Você não aparece na sua própria lista
- Votos podem ser alterados a qualquer momento reacessando `/votar`
- Não é obrigatório avaliar todos — só quem você conhece

---

### 2. Check-in (jogador)

1. Acesse `/painel` após login
2. Se houver rodada ativa em `draft`, aparece o card com data e vagas disponíveis
3. Clique **Confirmar presença** — contador atualiza
4. Para cancelar, clique **Cancelar presença**
5. Rodadas `drawn` ou `closed` não aceitam check-in
6. Limite rígido de 18 por rodada — após lotado, exibe mensagem

---

### 3. Painel do jogador

1. `/painel` mostra:
   - Rodada ativa com data, status e confirmados (X/18)
   - **Potes da rodada** — grade com os 6 potes e jogadores (aparece após admin montar potes); seu nome aparece destacado em verde com ▶
   - Pote e time próprios (após sorteio)
   - Histórico de rodadas anteriores com pote e time
2. Links rápidos: Avaliar jogadores, Ranking

---

### 4. Ranking público

1. Acesse `/ranking`
2. Ordenado por `ranking_index` decrescente
3. **Desempate:** mesmo índice → mais votos recebidos fica à frente
4. Exibe: posição, nome, índice (2 casas), votos recebidos, pontos totais

---

### 5. Fluxo admin — criar e sortear rodada

#### 5.1 Login admin
1. Acesse `/admin` e insira a senha
2. Sessão salva no sessionStorage — navegar entre `/admin`, `/admin/jogadores` e `/admin/rodada` não pede senha novamente

#### 5.2 Criar rodada
1. `/admin/rodada` → preencha a data (máscara dd/mm/aaaa) → **Criar**

#### 5.3 Cadastrar novato inline
1. `/admin/rodada` → **Cadastrar novato → + Adicionar**
2. Preencha nome e pote provisório → **Cadastrar**
3. Cria o jogador com `is_novice = true` e adiciona à rodada com pote manual reservado

#### 5.4 Confirmar participantes
1. Marque os jogadores na lista — contador X/18 em tempo real
2. Jogadores sem votos marcados como novato precisam de pote manual
3. Com 18 confirmados, **Montar potes** fica disponível

#### 5.5 Montar potes
1. Clique **Montar potes**
2. Algoritmo:
   - Novatos ocupam suas vagas reservadas primeiro
   - Ranqueados preenchem vagas restantes por `ranking_index DESC → vote_count DESC → id ASC`
3. Potes exibidos em grade — também ficam visíveis no painel de cada jogador

#### 5.6 Sortear times
1. Clique **Sortear times**
2. Fisher-Yates embaralha os 3 de cada pote → índice 0→Time 1, 1→Time 2, 2→Time 3
3. Times em colunas verde/azul/laranja com badge do pote

#### 5.7 Substituição (durante o jogo)
1. Com rodada `drawn`, botão ⇄ aparece ao lado de cada jogador
2. Clique ⇄ → lista todos os jogadores ativos fora dos times como opções
3. Clique no substituto — assume pote e time do titular
4. Substituto não pode já estar em um time

#### 5.8 Revelar resultado
1. No dashboard `/admin` → **Revelar resultado**
2. `/resultado` exibe os times publicamente
3. Resultado permanece visível após encerrar rodada

#### 5.9 Encerrar rodada
1. No dashboard `/admin`, quando `status=drawn`, aparece **Encerrar rodada**
2. Após encerrar: substituições bloqueadas, resultado continua visível

---

### 6. Gerenciamento de jogadores (admin)

1. `/admin/jogadores` — lista ativos e inativos
2. **Adicionar:** nome → Adicionar
3. **Editar nome:** Editar → altere → Salvar
4. **Marcar/Remover goleiro:** badge azul **Goleiro** + visível em `/votar`
5. **Marcar/Remover novato:** badge laranja **Novato** + visível em `/votar`
6. **Inativar:** remove da lista de votação e check-in (histórico preservado)
7. **Reativar:** disponível na seção Inativos
8. Para **excluir completamente** um jogador: rodar `DELETE FROM players WHERE name = 'Nome';` no Supabase

---

## Regras de negócio validadas

| # | Regra | Status |
|---|-------|--------|
| 1 | Cadastro ilimitado de jogadores | ✅ |
| 2 | Cada rodada usa exatamente 18 jogadores | ✅ |
| 3 | 6 potes × 3 jogadores | ✅ |
| 4 | 3 times × 6 jogadores (1 de cada pote) | ✅ |
| 5 | Pote 1 = melhor, Pote 6 = mais fraco | ✅ |
| 6 | Pontuação correta por pote (18/12/10/6/3/1) | ✅ |
| 7 | Jogador não vota em si mesmo | ✅ |
| 8 | Índice = soma ÷ quantidade de votos | ✅ |
| 9 | Ranking decrescente por índice | ✅ |
| 10 | Desempate: mais votos recebidos fica à frente | ✅ |
| 11 | Potes preenchidos por ordem de ranking dos presentes | ✅ |
| 12 | Novato com pote manual reserva vaga antes do automático | ✅ |
| 13 | Pote provisório do novato não altera ranking oficial | ✅ |
| 14 | Sorteio embaralha cada pote (Fisher-Yates) e distribui 1 por time | ✅ |
| 15 | Substituição por jogador ativo fora dos times, herdando pote e time | ✅ |
| 16 | Resultado em 3 colunas com badge do pote | ✅ |
| 17 | Resultado visível após encerrar rodada | ✅ |

---

## Comandos úteis

```bash
npm run dev        # desenvolvimento local (http://localhost:3000)
npm run build      # valida TypeScript + lint
npm run lint       # ESLint
```

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

## SQL útil para manutenção

```sql
-- Adicionar jogador
INSERT INTO players (name) VALUES ('Nome');

-- Excluir jogador completamente
DELETE FROM players WHERE name = 'Nome';

-- Inativar jogador (mantém histórico)
UPDATE players SET active = false WHERE name = 'Nome';

-- Marcar goleiro
UPDATE players SET is_goalkeeper = true WHERE name = 'Nome';

-- Marcar novato
UPDATE players SET is_novice = true WHERE name = 'Nome';

-- Limpar votação de um jogador
DELETE FROM votes WHERE voter_id = (SELECT id FROM players WHERE name = 'Nome');

-- Limpar todos os votos
DELETE FROM votes;

-- Limpar rodada ativa (reset completo)
DELETE FROM round_teams;
DELETE FROM round_pots;
DELETE FROM round_participants;
DELETE FROM rounds;
UPDATE baba_settings SET value = '' WHERE key = 'active_round_id';
UPDATE baba_settings SET value = 'false' WHERE key = 'results_revealed';

-- Verificar ranking atual
SELECT name, ranking_index, vote_count, total_points, is_novice, is_goalkeeper
FROM player_ranking
WHERE active = true
ORDER BY ranking_index DESC, vote_count DESC;
```
