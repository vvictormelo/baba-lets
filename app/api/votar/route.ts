import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { POTE_POINTS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { voter_id, votes } = body as {
    voter_id: number
    votes: { votee_id: number; pote: number }[]
  }

  if (!voter_id || !Array.isArray(votes) || votes.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  if (votes.some(v => v.votee_id === voter_id)) {
    return NextResponse.json({ error: 'Não pode votar em si mesmo' }, { status: 400 })
  }
  if (votes.some(v => v.pote < 1 || v.pote > 6)) {
    return NextResponse.json({ error: 'Pote inválido (1-6)' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: voter } = await supabase
    .from('players')
    .select('id')
    .eq('id', voter_id)
    .eq('active', true)
    .single()

  if (!voter) {
    return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
  }

  const rows = votes.map(v => ({
    voter_id,
    votee_id: v.votee_id,
    pote: v.pote,
    points: POTE_POINTS[v.pote],
  }))

  const { error } = await supabase
    .from('votes')
    .upsert(rows, { onConflict: 'voter_id,votee_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
