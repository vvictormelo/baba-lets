import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getActiveRoundId } from '@/lib/rounds'

export const dynamic = 'force-dynamic'

const schema = z.object({
  player_id: z.number().int().positive(),
  confirmar: z.boolean(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { player_id, confirmar } = parsed.data

  const supabase = createServerClient()

  const roundId = await getActiveRoundId(supabase)
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

  const now = new Date().toISOString()

  if (!confirmar) {
    // Registra ausência permanentemente e remove dos participantes
    await Promise.all([
      supabase
        .from('round_attendance')
        .upsert({ round_id: roundId, player_id, status: 'absent', updated_at: now }, { onConflict: 'round_id,player_id' }),
      supabase
        .from('round_participants')
        .delete()
        .eq('round_id', roundId)
        .eq('player_id', player_id),
    ])
    return NextResponse.json({ success: true, confirmado: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Verifica se o jogador é goleiro (vaga garantida fora dos 18)
  const { data: playerData } = await supabase
    .from('players')
    .select('is_goalkeeper')
    .eq('id', player_id)
    .single()
  const isGoalkeeper = playerData?.is_goalkeeper ?? false

  // Verifica se já está como participante (não conta no limite)
  const { data: existing } = await supabase
    .from('round_participants')
    .select('player_id')
    .eq('round_id', roundId)
    .eq('player_id', player_id)
    .single()

  let isSuplente = false
  if (!existing) {
    if (isGoalkeeper) {
      // Goleiro tem vaga garantida, não entra no limite dos 18
      await supabase
        .from('round_participants')
        .upsert({ round_id: roundId, player_id }, { onConflict: 'round_id,player_id' })
    } else {
      // Conta apenas jogadores de linha (sem goleiros) para o limite
      const { data: fieldParticipants } = await supabase
        .from('round_participants')
        .select('player_id, players!inner(is_goalkeeper)')
        .eq('round_id', roundId)
      const fieldCount = (fieldParticipants || []).filter(p => !(p.players as unknown as { is_goalkeeper: boolean }).is_goalkeeper).length

      if (fieldCount >= 18) {
        isSuplente = true
      } else {
        await supabase
          .from('round_participants')
          .upsert({ round_id: roundId, player_id }, { onConflict: 'round_id,player_id' })
      }
    }
  }

  // Persiste presença permanentemente
  const { error } = await supabase
    .from('round_attendance')
    .upsert({ round_id: roundId, player_id, status: 'confirmed', updated_at: now }, { onConflict: 'round_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove status de novato quando o jogador confirma presença
  await supabase.from('players').update({ is_novice: false }).eq('id', player_id).eq('is_novice', true)

  return NextResponse.json(
    { success: true, confirmado: true, suplente: isSuplente },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
