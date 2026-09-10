import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Todas as rodadas encerradas + ativa, com participantes e presença
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .order('scheduled_date', { ascending: false })

  if (!rounds?.length) {
    return NextResponse.json({ rounds: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const roundIds = rounds.map(r => r.id)

  const [{ data: players }, { data: attendance }, { data: participants }] = await Promise.all([
    supabase.from('players').select('id, name').eq('active', true).order('name'),
    supabase.from('round_attendance').select('round_id, player_id, status').in('round_id', roundIds),
    supabase.from('round_participants').select('round_id, player_id').in('round_id', roundIds),
  ])

  const participantSet = new Set(
    (participants || []).map(p => `${p.round_id}:${p.player_id}`)
  )

  // Agrupa presença por rodada
  const attendanceByRound: Record<number, Record<number, 'confirmed' | 'absent' | 'suplente'>> = {}
  for (const a of attendance || []) {
    if (!attendanceByRound[a.round_id]) attendanceByRound[a.round_id] = {}
    const key = `${a.round_id}:${a.player_id}`
    if (a.status === 'confirmed' && !participantSet.has(key)) {
      attendanceByRound[a.round_id][a.player_id] = 'suplente'
    } else {
      attendanceByRound[a.round_id][a.player_id] = a.status as 'confirmed' | 'absent'
    }
  }

  const result = rounds.map(round => {
    const byPlayer = attendanceByRound[round.id] ?? {}
    const stats = { confirmed: 0, suplente: 0, absent: 0, pending: 0 }
    const playerList = (players || []).map(p => {
      const status = byPlayer[p.id] ?? 'pending'
      stats[status]++
      return { id: p.id, name: p.name, status }
    })
    return { ...round, players: playerList, stats }
  })

  return NextResponse.json({ rounds: result }, { headers: { 'Cache-Control': 'no-store' } })
}
