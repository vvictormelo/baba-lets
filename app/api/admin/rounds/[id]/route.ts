import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const roundId = Number(params.id)
  if (!roundId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createServerClient()

  const { data: round } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .eq('id', roundId)
    .single()

  if (!round) return NextResponse.json({ error: 'Rodada não encontrada' }, { status: 404 })

  const { data: participants } = await supabase
    .from('round_participants')
    .select('player_id, is_novice, manual_pote, players(id, name)')
    .eq('round_id', roundId)

  const participantIds = (participants || []).map(p => p.player_id)
  const { data: ranking } = participantIds.length
    ? await supabase.from('player_ranking').select('id, ranking_index, vote_count').in('id', participantIds)
    : { data: [] }

  const rankingMap = Object.fromEntries((ranking || []).map(r => [r.id, r]))
  const participantsWithRanking = (participants || []).map(p => ({
    ...p,
    ranking_index: rankingMap[p.player_id]?.ranking_index ?? 0,
    vote_count: rankingMap[p.player_id]?.vote_count ?? 0,
  }))

  const { data: pots } = await supabase
    .from('round_pots')
    .select('player_id, pote, players(id, name)')
    .eq('round_id', roundId)

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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const roundId = Number(params.id)
  if (!roundId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createServerClient()

  const { error } = await supabase.from('rounds').delete().eq('id', roundId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  if (setting?.value === String(roundId)) {
    await supabase.from('baba_settings').upsert({ key: 'active_round_id', value: '' })
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
