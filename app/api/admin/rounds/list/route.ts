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

  // Contagem de participantes por rodada, separando jogadores de linha e goleiros.
  // Goleiros tem vaga garantida fora dos 18 e nao entram na montagem dos potes.
  const { data: participants } = await supabase
    .from('round_participants')
    .select('round_id, players!inner(is_goalkeeper)')
    .in('round_id', rounds.map(r => r.id))

  const fieldByRound: Record<number, number> = {}
  const keeperByRound: Record<number, number> = {}
  for (const p of participants || []) {
    const isKeeper = (p.players as unknown as { is_goalkeeper: boolean })?.is_goalkeeper
    const target = isKeeper ? keeperByRound : fieldByRound
    target[p.round_id] = (target[p.round_id] ?? 0) + 1
  }

  const result = rounds.map(r => ({
    id: r.id,
    scheduled_date: r.scheduled_date,
    status: r.status,
    field_count: fieldByRound[r.id] ?? 0,
    goalkeeper_count: keeperByRound[r.id] ?? 0,
    participant_count: (fieldByRound[r.id] ?? 0) + (keeperByRound[r.id] ?? 0),
  }))

  return NextResponse.json(
    { rounds: result, active_round_id: activeRoundId },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
