import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  const roundId = setting?.value ? Number(setting.value) : null
  if (!roundId) return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } })

  const { data: round } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .eq('id', roundId)
    .single()

  if (!round) return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } })

  // Participantes com dados do jogador e ranking
  const { data: participants } = await supabase
    .from('round_participants')
    .select('player_id, is_novice, manual_pote, players(id, name)')
    .eq('round_id', roundId)

  // Ranking dos participantes
  const participantIds = (participants || []).map(p => p.player_id)
  const { data: ranking } = participantIds.length
    ? await supabase
        .from('player_ranking')
        .select('id, ranking_index, vote_count')
        .in('id', participantIds)
    : { data: [] }

  const rankingMap = Object.fromEntries((ranking || []).map(r => [r.id, r]))

  const participantsWithRanking = (participants || []).map(p => ({
    ...p,
    ranking_index: rankingMap[p.player_id]?.ranking_index ?? 0,
    vote_count: rankingMap[p.player_id]?.vote_count ?? 0,
  }))

  // Potes montados
  const { data: pots } = await supabase
    .from('round_pots')
    .select('player_id, pote, players(id, name)')
    .eq('round_id', roundId)

  // Times sorteados
  const { data: teams } = await supabase
    .from('round_teams')
    .select('team, player_id, pote, players(id, name)')
    .eq('round_id', roundId)
    .order('team')
    .order('pote')

  return NextResponse.json(
    { round, participants: participantsWithRanking, pots: pots || [], teams: teams || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { scheduled_date } = await req.json()
  if (!scheduled_date) {
    return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: round, error } = await supabase
    .from('rounds')
    .insert({ scheduled_date, status: 'draft' })
    .select('id, scheduled_date, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Definir como rodada ativa e limpar reveal
  await supabase
    .from('baba_settings')
    .upsert({ key: 'active_round_id', value: String(round.id) })

  await supabase
    .from('baba_settings')
    .upsert({ key: 'results_revealed', value: 'false' })

  return NextResponse.json(round, { headers: { 'Cache-Control': 'no-store' } })
}
