import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  player_id: z.coerce.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({ player_id: req.nextUrl.searchParams.get('player_id') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }
  const { player_id } = parsed.data

  const supabase = createServerClient()

  // Histórico de votos recebidos pelo jogador
  const { data: history, error } = await supabase
    .from('vote_history')
    .select('id, voter_id, pote, points, prev_pote, prev_points, changed_at, voters:voter_id(name)')
    .eq('votee_id', player_id)
    .order('changed_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcula pontuação acumulada ao longo do tempo
  // Mantém o estado atual de cada voter para calcular o delta correto
  const voterCurrentPoints: Record<number, number> = {}
  let cumulativePoints = 0

  const timeline = (history || []).map(h => {
    const voterId = h.voter_id as number
    const prev = voterCurrentPoints[voterId] ?? 0
    const delta = h.points - prev
    cumulativePoints += delta
    voterCurrentPoints[voterId] = h.points

    return {
      id: h.id,
      voter_name: (h.voters as unknown as { name: string } | null)?.name ?? 'Desconhecido',
      pote: h.pote,
      prev_pote: h.prev_pote,
      points: h.points,
      delta,
      cumulative_points: cumulativePoints,
      changed_at: h.changed_at,
      is_update: h.prev_pote !== null,
    }
  })

  return NextResponse.json(
    { player_id, timeline },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
