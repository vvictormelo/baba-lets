import { NextRequest, NextResponse } from 'next/server'
import { hashPin, verifyPin } from '@/lib/pin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const HEADERS = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const player_id = body?.player_id
  const pin: string | undefined = body?.pin

  if (!player_id) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: player, error } = await supabase
    .from('players')
    .select('id, name, active, pin_hash')
    .eq('id', player_id)
    .single()

  if (error || !player) {
    return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
  }
  if (!player.active) {
    return NextResponse.json({ error: 'Jogador inativo' }, { status: 403 })
  }

  // PIN não enviado — informar ao cliente qual passo mostrar
  if (pin === undefined || pin === null || pin === '') {
    if (!player.pin_hash) {
      return NextResponse.json({ needs_pin_setup: true }, { status: 200, headers: HEADERS })
    }
    return NextResponse.json({ needs_pin: true }, { status: 200, headers: HEADERS })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN deve ter exatamente 4 dígitos' }, { status: 400 })
  }

  // Primeiro acesso — criar PIN
  if (!player.pin_hash) {
    const hash = await hashPin(pin)
    await supabase.from('players').update({ pin_hash: hash }).eq('id', player.id)
  } else {
    // Validar PIN existente
    const valid = await verifyPin(pin, player.pin_hash)
    if (!valid) {
      return NextResponse.json({ error: 'PIN incorreto' }, { status: 403, headers: HEADERS })
    }
  }

  const { count } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('voter_id', player_id)

  return NextResponse.json(
    { id: player.id, name: player.name, has_voted: (count ?? 0) > 0 },
    { headers: HEADERS }
  )
}
