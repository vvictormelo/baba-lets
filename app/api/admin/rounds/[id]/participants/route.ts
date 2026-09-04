import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Adiciona ou remove participante; atualiza novato/pote_manual
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const { player_id, confirmed, is_novice, manual_pote } = await req.json()

  if (!player_id) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  if (!confirmed) {
    // Remove da rodada
    await supabase
      .from('round_participants')
      .delete()
      .eq('round_id', round_id)
      .eq('player_id', player_id)

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Verifica limite de 18
  const { count } = await supabase
    .from('round_participants')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', round_id)

  const alreadyIn = await supabase
    .from('round_participants')
    .select('player_id')
    .eq('round_id', round_id)
    .eq('player_id', player_id)
    .single()

  if (!alreadyIn.data && (count ?? 0) >= 18) {
    return NextResponse.json({ error: 'Rodada já tem 18 participantes' }, { status: 409 })
  }

  const row: Record<string, unknown> = { round_id, player_id }
  if (typeof is_novice === 'boolean') row.is_novice = is_novice
  if (manual_pote !== undefined) row.manual_pote = manual_pote || null

  const { error } = await supabase
    .from('round_participants')
    .upsert(row, { onConflict: 'round_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
