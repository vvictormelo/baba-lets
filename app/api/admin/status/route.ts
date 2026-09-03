import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Jogadores que já lançaram ao menos 1 voto
  const { data: players } = await supabase
    .from('players')
    .select('id, name, active')
    .eq('active', true)
    .order('name')

  const allIds = (players || []).map(p => p.id)

  const { data: voterIds } = await supabase
    .from('votes')
    .select('voter_id')
    .in('voter_id', allIds)

  const votedSet = new Set((voterIds || []).map(v => v.voter_id))

  const voted = (players || []).filter(p => votedSet.has(p.id))
  const notVoted = (players || []).filter(p => !votedSet.has(p.id))

  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'results_revealed')
    .single()

  const { data: activeRoundSetting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  let activeRound = null
  const roundId = activeRoundSetting?.value ? Number(activeRoundSetting.value) : null
  if (roundId) {
    const { data: round } = await supabase
      .from('rounds')
      .select('id, scheduled_date, status')
      .eq('id', roundId)
      .single()
    activeRound = round
  }

  return NextResponse.json({
    total: (players || []).length,
    voted: voted.length,
    voted_list: voted.map(p => p.name),
    not_voted: notVoted.map(p => p.name),
    results_revealed: setting?.value === 'true',
    active_round: activeRound,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
