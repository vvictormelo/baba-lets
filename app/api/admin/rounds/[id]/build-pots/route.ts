import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { POT_SIZE, VALID_ROUND_SIZES, isValidRoundSize } from '@/lib/constants'

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

  // Busca participantes excluindo goleiros (que têm vaga garantida fora dos 18)
  const { data: allParticipants, error: pErr } = await supabase
    .from('round_participants')
    .select('player_id, is_novice, manual_pote, players!inner(is_goalkeeper)')
    .eq('round_id', round_id)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const participants = (allParticipants || []).filter(
    p => !(p.players as unknown as { is_goalkeeper: boolean }).is_goalkeeper
  )

  // A quantidade de potes acompanha o total de jogadores de linha, sempre com
  // POT_SIZE por pote: 12 -> 4 potes, 15 -> 5, 18 -> 6. Assim cada time recebe
  // 1 jogador de cada pote e os tres times saem do mesmo tamanho.
  if (!isValidRoundSize(participants.length)) {
    return NextResponse.json(
      {
        error: `Rodada precisa de ${VALID_ROUND_SIZES.join(', ')} jogadores de linha. Atual: ${participants.length}`,
      },
      { status: 400 }
    )
  }

  const potCount = participants.length / POT_SIZE

  // Valida novatos com pote manual
  const novatos = participants.filter(p => p.is_novice)
  const invalidNovatos = novatos.filter(p => !p.manual_pote)
  if (invalidNovatos.length > 0) {
    return NextResponse.json(
      { error: 'Todos os novatos precisam ter um pote manual definido' },
      { status: 400 }
    )
  }

  // Com menos potes, um pote manual alto deixa de existir nesta rodada
  const novatosForaDoIntervalo = novatos.filter(p => p.manual_pote! > potCount)
  if (novatosForaDoIntervalo.length > 0) {
    return NextResponse.json(
      { error: `Esta rodada tem ${potCount} potes. Ajuste o pote dos novatos para no maximo ${potCount}.` },
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
  const poteNums = Array.from({ length: potCount }, (_, i) => i + 1)
  const potes: Record<number, number[]> = Object.fromEntries(poteNums.map(n => [n, [] as number[]]))
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

  // Preenche os potes em ordem com os ranqueados
  const queue = [...sortedRegular]
  for (const poteNum of poteNums) {
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
