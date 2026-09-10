import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  const [{ data: rounds }, { data: setting }] = await Promise.all([
    supabase.from('rounds').select('id, scheduled_date, status').order('scheduled_date', { ascending: false }),
    supabase.from('baba_settings').select('value').eq('key', 'active_round_id').single(),
  ])

  const activeRoundId = setting?.value ? Number(setting.value) : null

  if (!rounds) return NextResponse.json({ rounds: [], active_round_id: null }, { headers: { 'Cache-Control': 'no-store' } })

  // Busca contagem de participantes por rodada
  const { data: participants } = await supabase
    .from('round_participants')
    .select('round_id')
    .in('round_id', rounds.map(r => r.id))

  const countByRound: Record<number, number> = {}
  for (const p of participants || []) {
    countByRound[p.round_id] = (countByRound[p.round_id] ?? 0) + 1
  }

  const result = rounds.map(r => ({
    id: r.id,
    scheduled_date: r.scheduled_date,
    status: r.status,
    participant_count: countByRound[r.id] ?? 0,
  }))

  return NextResponse.json(
    { rounds: result, active_round_id: activeRoundId },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
