import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { ROUND_SIZE, POT_SIZE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const supabase = createServerClient()

  // Valida 18 participantes
  const { data: participants, error: pErr } = await supabase
    .from('round_participants')
    .select('player_id, is_novice, manual_pote')
    .eq('round_id', round_id)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!participants || participants.length !== ROUND_SIZE) {
    return NextResponse.json(
      { error: `Rodada precisa de exatamente ${ROUND_SIZE} participantes` },
      { status: 400 }
    )
  }

  // Valida novatos com pote manual
  const novatos = participants.filter(p => p.is_novice)
  const invalidNovatos = novatos.filter(p => !p.manual_pote)
  if (invalidNovatos.length > 0) {
    return NextResponse.json(
      { error: 'Todos os novatos precisam ter um pote manual definido' },
      { status: 400 }
    )
  }

  // Jogadores ranqueados (não novatos)
  const regularIds = participants.filter(p => !p.is_novice).map(p => p.player_id)

  const { data: ranking, error: rErr } = await supabase
    .from('player_ranking')
    .select('id, ranking_index, vote_count')
    .in('id', regularIds)

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  // Ordena por índice desc; empate → mais votos primeiro; empate → id asc
  const sortedRegular = (ranking || [])
    .sort((a, b) =>
      Number(b.ranking_index) - Number(a.ranking_index) ||
      Number(b.vote_count) - Number(a.vote_count) ||
      a.id - b.id
    )
    .map(r => r.id)

  // Inicializa potes com novatos
  const potes: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const novato of novatos) {
    potes[novato.manual_pote!].push(novato.player_id)
  }

  // Valida que nenhum pote tem mais de 3 novatos
  for (const [pote, ids] of Object.entries(potes)) {
    if (ids.length > POT_SIZE) {
      return NextResponse.json(
        { error: `Pote ${pote} tem mais de ${POT_SIZE} novatos` },
        { status: 400 }
      )
    }
  }

  // Preenche potes 1→6 com ranqueados
  const queue = [...sortedRegular]
  for (const poteNum of [1, 2, 3, 4, 5, 6]) {
    const vagas = POT_SIZE - potes[poteNum].length
    potes[poteNum].push(...queue.splice(0, vagas))
  }

  // Monta rows
  const rows: { round_id: number; player_id: number; pote: number }[] = []
  for (const [pote, playerIds] of Object.entries(potes)) {
    for (const playerId of playerIds) {
      rows.push({ round_id, player_id: playerId, pote: Number(pote) })
    }
  }

  // Limpa potes anteriores e insere novos
  await supabase.from('round_pots').delete().eq('round_id', round_id)
  await supabase.from('round_teams').delete().eq('round_id', round_id)

  const { error: insertErr } = await supabase.from('round_pots').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ potes }, { headers: { 'Cache-Control': 'no-store' } })
}
