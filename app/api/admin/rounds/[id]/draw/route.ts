import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const supabase = createServerClient()

  const { data: pots, error: potErr } = await supabase
    .from('round_pots')
    .select('player_id, pote')
    .eq('round_id', round_id)

  if (potErr) return NextResponse.json({ error: potErr.message }, { status: 500 })
  if (!pots || pots.length !== 18) {
    return NextResponse.json({ error: 'Monte os potes antes de sortear' }, { status: 400 })
  }

  // Agrupa por pote
  const byPote: Record<number, number[]> = {}
  for (const p of pots) {
    if (!byPote[p.pote]) byPote[p.pote] = []
    byPote[p.pote].push(p.player_id)
  }

  // Sorteia: para cada pote embaralha e distribui 1 por time
  const rows: { round_id: number; team: number; player_id: number; pote: number }[] = []
  for (const [poteStr, playerIds] of Object.entries(byPote)) {
    const pote = Number(poteStr)
    const shuffled = shuffle(playerIds)
    shuffled.forEach((playerId, i) => {
      rows.push({ round_id, team: i + 1, player_id: playerId, pote })
    })
  }

  // Limpa sorteio anterior e insere
  await supabase.from('round_teams').delete().eq('round_id', round_id)
  const { error: insertErr } = await supabase.from('round_teams').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Atualiza status da rodada
  await supabase.from('rounds').update({ status: 'drawn' }).eq('id', round_id)

  return NextResponse.json({ success: true, teams: rows }, { headers: { 'Cache-Control': 'no-store' } })
}
