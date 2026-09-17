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

  // MVP e Pereba: vencedores da votação da rodada
  const { data: awardRows } = await supabase
    .from('round_awards')
    .select('mvp_id, pereba_id, mvp:players!round_awards_mvp_id_fkey(id,name), pereba:players!round_awards_pereba_id_fkey(id,name)')
    .eq('round_id', roundId)

  let mvp: { id: number; name: string } | null = null
  let pereba: { id: number; name: string } | null = null

  if (awardRows && awardRows.length > 0) {
    const mvpCount = new Map<number, { id: number; name: string; votes: number }>()
    const perebaCount = new Map<number, { id: number; name: string; votes: number }>()
    for (const row of awardRows) {
      const m = row.mvp as unknown as { id: number; name: string }
      const p = row.pereba as unknown as { id: number; name: string }
      const pm = mvpCount.get(row.mvp_id) ?? { id: m.id, name: m.name, votes: 0 }
      mvpCount.set(row.mvp_id, { ...pm, votes: pm.votes + 1 })
      const pp = perebaCount.get(row.pereba_id) ?? { id: p.id, name: p.name, votes: 0 }
      perebaCount.set(row.pereba_id, { ...pp, votes: pp.votes + 1 })
    }
    mvp = [...mvpCount.values()].sort((a, b) => b.votes - a.votes)[0] ?? null
    pereba = [...perebaCount.values()].sort((a, b) => b.votes - a.votes)[0] ?? null
  }

  return NextResponse.json(
    { revealed: true, round, teams: teams || [], pots: pots || [], mvp, pereba },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
