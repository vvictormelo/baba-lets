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

  if (!round || round.status !== 'drawn') {
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

  return NextResponse.json(
    { revealed: true, round, teams: teams || [], pots: pots || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
