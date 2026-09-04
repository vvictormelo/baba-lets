import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const player_id = req.nextUrl.searchParams.get('player_id')
  if (!player_id) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Rodada ativa
  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()
  const activeRoundId = setting?.value ? Number(setting.value) : null

  // Dados completos da rodada ativa (data, status, total confirmados)
  let activeRound: { id: number; scheduled_date: string; status: string; confirmados: number } | null = null
  if (activeRoundId) {
    const [{ data: round }, { count }] = await Promise.all([
      supabase.from('rounds').select('id, scheduled_date, status').eq('id', activeRoundId).single(),
      supabase.from('round_participants').select('*', { count: 'exact', head: true }).eq('round_id', activeRoundId),
    ])
    if (round) {
      activeRound = { ...round, confirmados: count ?? 0 }
    }
  }

  // Participações do jogador em rodadas
  const { data: participations } = await supabase
    .from('round_participants')
    .select('round_id, is_novice, manual_pote, rounds(id, scheduled_date, status)')
    .eq('player_id', Number(player_id))

  const roundIds = (participations || []).map(p => p.round_id)

  // Pote e time do jogador em cada rodada
  const [{ data: pots }, { data: teams }] = roundIds.length
    ? await Promise.all([
        supabase.from('round_pots').select('round_id, pote').eq('player_id', Number(player_id)).in('round_id', roundIds),
        supabase.from('round_teams').select('round_id, team, pote').eq('player_id', Number(player_id)).in('round_id', roundIds),
      ])
    : [{ data: [] }, { data: [] }]

  const potMap = Object.fromEntries((pots || []).map(p => [p.round_id, p.pote]))
  const teamMap = Object.fromEntries((teams || []).map(t => [t.round_id, t.team]))

  const history = (participations || [])
    .map(p => {
      const round = p.rounds as { id: number; scheduled_date: string; status: string } | null
      return {
        round_id: p.round_id,
        scheduled_date: round?.scheduled_date ?? null,
        status: round?.status ?? null,
        is_novice: p.is_novice,
        pote: potMap[p.round_id] ?? null,
        team: teamMap[p.round_id] ?? null,
        active: p.round_id === activeRoundId,
      }
    })
    .sort((a, b) => {
      if (!a.scheduled_date) return 1
      if (!b.scheduled_date) return -1
      return b.scheduled_date.localeCompare(a.scheduled_date)
    })

  return NextResponse.json(
    { active_round_id: activeRoundId, active_round: activeRound, history },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
