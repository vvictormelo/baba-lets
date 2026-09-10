import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getActiveRound } from '@/lib/rounds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  const round = await getActiveRound(supabase)
  if (!round) {
    return NextResponse.json(
      { round: null, confirmados: [], suplentes: [], ausentes: [], pendentes: [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const [
    { data: players },
    { data: attendance },
    { data: participants },
  ] = await Promise.all([
    supabase.from('players').select('id, name').eq('active', true).order('name'),
    supabase.from('round_attendance').select('player_id, status').eq('round_id', round.id),
    supabase.from('round_participants').select('player_id').eq('round_id', round.id),
  ])

  const participantSet = new Set((participants || []).map(p => p.player_id))
  const attendanceMap = Object.fromEntries(
    (attendance || []).map(a => [a.player_id, a.status])
  )

  const confirmados: { id: number; name: string }[] = []
  const suplentes: { id: number; name: string }[] = []
  const ausentes: { id: number; name: string }[] = []
  const pendentes: { id: number; name: string }[] = []

  for (const p of players || []) {
    const status = attendanceMap[p.id]
    if (status === 'confirmed') {
      if (participantSet.has(p.id)) {
        confirmados.push(p)
      } else {
        suplentes.push(p)
      }
    } else if (status === 'absent') {
      ausentes.push(p)
    } else {
      pendentes.push(p)
    }
  }

  return NextResponse.json(
    { round, confirmados, suplentes, ausentes, pendentes },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
