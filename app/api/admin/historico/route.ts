import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .order('scheduled_date', { ascending: false })

  if (!rounds?.length) {
    return NextResponse.json({ rounds: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const roundIds = rounds.map(r => r.id)

  const [
    { data: attendance },
    { data: participants },
    { data: teams },
    { data: pots },
  ] = await Promise.all([
    supabase
      .from('round_attendance')
      .select('round_id, player_id, status, players(name)')
      .in('round_id', roundIds),
    supabase
      .from('round_participants')
      .select('round_id, player_id')
      .in('round_id', roundIds),
    supabase
      .from('round_teams')
      .select('round_id, team, player_id, pote, players(name)')
      .in('round_id', roundIds)
      .order('team')
      .order('pote'),
    supabase
      .from('round_pots')
      .select('round_id, player_id, pote, players(name)')
      .in('round_id', roundIds)
      .order('pote'),
  ])

  const participantSet = new Set((participants || []).map(p => `${p.round_id}:${p.player_id}`))

  // Agrupa por rodada
  const teamsByRound: Record<number, typeof teams> = {}
  const potsByRound: Record<number, typeof pots> = {}
  const attendanceByRound: Record<number, { confirmed: number; absent: number; suplente: number; pending_count: number; players: { name: string; status: string }[] }> = {}

  for (const t of teams || []) {
    if (!teamsByRound[t.round_id]) teamsByRound[t.round_id] = []
    teamsByRound[t.round_id]!.push(t)
  }
  for (const p of pots || []) {
    if (!potsByRound[p.round_id]) potsByRound[p.round_id] = []
    potsByRound[p.round_id]!.push(p)
  }
  for (const a of attendance || []) {
    if (!attendanceByRound[a.round_id]) {
      attendanceByRound[a.round_id] = { confirmed: 0, absent: 0, suplente: 0, pending_count: 0, players: [] }
    }
    const key = `${a.round_id}:${a.player_id}`
    const status = a.status === 'confirmed' && !participantSet.has(key) ? 'suplente' : a.status
    attendanceByRound[a.round_id].players.push({
      name: (a.players as unknown as { name: string })?.name ?? '',
      status,
    })
    if (status === 'confirmed') attendanceByRound[a.round_id].confirmed++
    else if (status === 'absent') attendanceByRound[a.round_id].absent++
    else if (status === 'suplente') attendanceByRound[a.round_id].suplente++
  }

  const result = rounds.map(round => ({
    id: round.id,
    scheduled_date: round.scheduled_date,
    status: round.status,
    attendance: attendanceByRound[round.id] ?? { confirmed: 0, absent: 0, suplente: 0, pending_count: 0, players: [] },
    teams: (teamsByRound[round.id] || []).map(t => ({
      team: t.team,
      player_id: t.player_id,
      pote: t.pote,
      name: (t.players as unknown as { name: string })?.name ?? '',
    })),
    pots: (potsByRound[round.id] || []).map(p => ({
      player_id: p.player_id,
      pote: p.pote,
      name: (p.players as unknown as { name: string })?.name ?? '',
    })),
  }))

  return NextResponse.json({ rounds: result }, { headers: { 'Cache-Control': 'no-store' } })
}
