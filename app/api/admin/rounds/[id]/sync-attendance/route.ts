import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminPwd = req.headers.get('x-admin-password')
  if (!adminPwd || adminPwd !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const roundId = Number(params.id)
  if (!roundId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createServerClient()

  // Busca todos os participantes confirmados da rodada
  const { data: participants, error: partErr } = await supabase
    .from('round_participants')
    .select('player_id')
    .eq('round_id', roundId)

  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 })
  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante encontrado para esta rodada' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const rows = participants.map(p => ({
    round_id: roundId,
    player_id: p.player_id,
    status: 'confirmed',
    updated_at: now,
  }))

  const { error } = await supabase
    .from('round_attendance')
    .upsert(rows, { onConflict: 'round_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { success: true, synced: participants.length },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
