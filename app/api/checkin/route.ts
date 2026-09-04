import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { player_id, confirmar } = await req.json()

  if (!player_id) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Busca rodada ativa
  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  const roundId = setting?.value ? Number(setting.value) : null
  if (!roundId) {
    return NextResponse.json({ error: 'Nenhuma rodada ativa no momento' }, { status: 404 })
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id, status')
    .eq('id', roundId)
    .single()

  if (!round || round.status === 'drawn' || round.status === 'closed') {
    return NextResponse.json({ error: 'Rodada não está aceitando confirmações' }, { status: 409 })
  }

  if (!confirmar) {
    // Cancela presença
    await supabase
      .from('round_participants')
      .delete()
      .eq('round_id', roundId)
      .eq('player_id', player_id)

    return NextResponse.json({ success: true, confirmado: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Verifica limite de 18
  const { data: existing } = await supabase
    .from('round_participants')
    .select('player_id')
    .eq('round_id', roundId)
    .eq('player_id', player_id)
    .single()

  if (!existing) {
    const { count } = await supabase
      .from('round_participants')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId)

    if ((count ?? 0) >= 18) {
      return NextResponse.json({ error: 'Rodada já tem 18 confirmados. Fale com o admin.' }, { status: 409 })
    }
  }

  const { error } = await supabase
    .from('round_participants')
    .upsert({ round_id: roundId, player_id }, { onConflict: 'round_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, confirmado: true }, { headers: { 'Cache-Control': 'no-store' } })
}
