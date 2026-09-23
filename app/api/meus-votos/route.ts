import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getActiveRoundId } from '@/lib/rounds'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const voter_id = req.nextUrl.searchParams.get('voter_id')
  if (!voter_id) {
    return NextResponse.json({ error: 'voter_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const round_id = await getActiveRoundId(supabase)

  // Busca o histórico completo do votante, não só a rodada ativa.
  // A avaliação de um jogador é cumulativa (ver view player_ranking), então a
  // tela de votação precisa vir preenchida com a última nota que ele deu —
  // filtrar pela rodada ativa deixava tudo em branco até ele revotar.
  const { data, error } = await supabase
    .from('votes')
    .select('votee_id, pote, points, round_id')
    .eq('voter_id', Number(voter_id))
    .order('round_id', { ascending: true, nullsFirst: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ordem crescente de rodada: a última avaliação de cada jogador sobrescreve as anteriores
  const latest = new Map<number, { votee_id: number; pote: number; points: number; round_id: number | null }>()
  for (const v of data || []) latest.set(v.votee_id, v)

  const votes = Array.from(latest.values()).map(v => ({
    votee_id: v.votee_id,
    pote: v.pote,
    points: v.points,
    round_id: v.round_id,
    // true quando a nota veio de uma rodada anterior e ainda não foi reconfirmada
    from_previous_round: round_id !== null && v.round_id !== round_id,
  }))

  return NextResponse.json(votes, { headers: { 'Cache-Control': 'no-store' } })
}
