import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const { player_out_id, player_in_id } = await req.json()

  if (!player_out_id || !player_in_id) {
    return NextResponse.json({ error: 'player_out_id e player_in_id obrigatórios' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Busca pote e time do jogador que sai
  const { data: outEntry } = await supabase
    .from('round_teams')
    .select('team, pote')
    .eq('round_id', round_id)
    .eq('player_id', player_out_id)
    .single()

  if (!outEntry) {
    return NextResponse.json({ error: 'Jogador não está no sorteio' }, { status: 404 })
  }

  // Valida que o substituto é um jogador ativo
  const { data: playerIn } = await supabase
    .from('players')
    .select('id')
    .eq('id', player_in_id)
    .eq('active', true)
    .single()

  if (!playerIn) {
    return NextResponse.json({ error: 'Substituto não encontrado ou inativo' }, { status: 404 })
  }

  // Valida que o substituto não está já em um time desta rodada
  const { data: alreadyInTeam } = await supabase
    .from('round_teams')
    .select('player_id')
    .eq('round_id', round_id)
    .eq('player_id', player_in_id)
    .single()

  if (alreadyInTeam) {
    return NextResponse.json({ error: 'Substituto já está em um time' }, { status: 409 })
  }

  // Faz a substituição mantendo pote do titular
  const { error } = await supabase
    .from('round_teams')
    .update({ player_id: player_in_id })
    .eq('round_id', round_id)
    .eq('player_id', player_out_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
