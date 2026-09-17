import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  const { data: revealSetting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'results_revealed')
    .single()

  if (revealSetting?.value !== 'true') {
    return NextResponse.json({ revealed: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: roundSetting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  const roundId = roundSetting?.value ? Number(roundSetting.value) : null
  if (!roundId) {
    return NextResponse.json({ revealed: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .eq('id', roundId)
    .single()

  if (!round || !['drawn', 'closed'].includes(round.status)) {
    return NextResponse.json({ revealed: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: teams } = await supabase
    .from('round_teams')
    .select('team, player_id, pote, players(id, name)')
    .eq('round_id', roundId)
    .order('team')
    .order('pote')

  const { data: pots } = await supabase
    .from('round_pots')
    .select('player_id, pote, players(id, name)')
    .eq('round_id', roundId)
    .order('pote')

  // MVP e Pereba: calculados a partir dos votos desta rodada específica
  let mvp: { id: number; name: string; total_points: number } | null = null
  let pereba: { id: number; name: string; total_points: number } | null = null

  const { data: roundVotes } = await supabase
    .from('votes')
    .select('votee_id, points, players(id, name)')
    .eq('round_id', roundId)

  if (roundVotes && roundVotes.length > 0) {
    const totals = new Map<number, { id: number; name: string; total_points: number }>()
    for (const v of roundVotes) {
      const player = v.players as unknown as { id: number; name: string }
      const prev = totals.get(v.votee_id) ?? { id: player.id, name: player.name, total_points: 0 }
      totals.set(v.votee_id, { ...prev, total_points: prev.total_points + v.points })
    }
    const sorted = [...totals.values()].sort((a, b) => b.total_points - a.total_points)
    if (sorted.length > 0) {
      mvp = sorted[0]
      pereba = sorted[sorted.length - 1]
    }
  }

  return NextResponse.json(
    { revealed: true, round, teams: teams || [], pots: pots || [], mvp, pereba },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
