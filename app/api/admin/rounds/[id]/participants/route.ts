import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Adiciona ou remove participante; atualiza novato/pote_manual.
// absent=true marca "não vai" (mesmo efeito do checkin do jogador); absent=false desfaz a marcação.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const { player_id, confirmed, is_novice, manual_pote, absent } = await req.json()

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

    if (absent === true) {
      const { error } = await supabase
        .from('round_attendance')
        .upsert(
          { round_id, player_id, status: 'absent', updated_at: new Date().toISOString() },
          { onConflict: 'round_id,player_id' }
        )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (absent === false) {
      await supabase
        .from('round_attendance')
        .delete()
        .eq('round_id', round_id)
        .eq('player_id', player_id)
        .eq('status', 'absent')
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Verifica se o jogador é goleiro (vaga garantida fora dos 18)
  const { data: playerData } = await supabase
    .from('players')
    .select('is_goalkeeper')
    .eq('id', player_id)
    .single()
  const isGoalkeeper = playerData?.is_goalkeeper ?? false

  const alreadyIn = await supabase
    .from('round_participants')
    .select('player_id')
    .eq('round_id', round_id)
    .eq('player_id', player_id)
    .single()

  if (!alreadyIn.data && !isGoalkeeper) {
    // Conta apenas jogadores de linha para o limite de 18
    const { data: fieldParticipants } = await supabase
      .from('round_participants')
      .select('player_id, players!inner(is_goalkeeper)')
      .eq('round_id', round_id)
    const fieldCount = (fieldParticipants || []).filter(p => !(p.players as unknown as { is_goalkeeper: boolean }).is_goalkeeper).length

    if (fieldCount >= 18) {
      return NextResponse.json({ error: 'Rodada já tem 18 participantes' }, { status: 409 })
    }
  }

  const row: Record<string, unknown> = { round_id, player_id }
  if (typeof is_novice === 'boolean') row.is_novice = is_novice
  if (manual_pote !== undefined) row.manual_pote = manual_pote || null

  const { error } = await supabase
    .from('round_participants')
    .upsert(row, { onConflict: 'round_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Confirmar pelo admin derruba uma ausencia marcada antes, senao o painel do jogador seguiria "Ausente"
  await supabase
    .from('round_attendance')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('round_id', round_id)
    .eq('player_id', player_id)
    .eq('status', 'absent')

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
