import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { player_id } = await req.json()
  if (!player_id) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: player, error } = await supabase
    .from('players')
    .select('id, name, active')
    .eq('id', player_id)
    .single()

  if (error || !player) {
    return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
  }
  if (!player.active) {
    return NextResponse.json({ error: 'Jogador inativo' }, { status: 403 })
  }

  const { count } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('voter_id', player_id)

  return NextResponse.json(
    { id: player.id, name: player.name, has_voted: (count ?? 0) > 0 },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
