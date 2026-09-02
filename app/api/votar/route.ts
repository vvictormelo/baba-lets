import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { voter_id, votes } = await req.json()

  if (!voter_id || !votes || !Array.isArray(votes)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Validate: exactly 3 per pote, potes 1-6
  const poteCounts: Record<number, number> = {}
  for (const v of votes) {
    if (v.pote < 1 || v.pote > 6) {
      return NextResponse.json({ error: 'Pote inválido' }, { status: 400 })
    }
    poteCounts[v.pote] = (poteCounts[v.pote] || 0) + 1
  }

  for (let p = 1; p <= 6; p++) {
    if ((poteCounts[p] || 0) !== 3) {
      return NextResponse.json({ error: `Pote ${p} deve ter exatamente 3 pessoas` }, { status: 400 })
    }
  }

  const supabase = createServerClient()

  // Check if already voted
  const { data: participant } = await supabase
    .from('baba_participants')
    .select('has_voted')
    .eq('id', voter_id)
    .single()

  if (participant?.has_voted) {
    return NextResponse.json({ error: 'Você já votou' }, { status: 409 })
  }

  // Insert votes
  const rows = votes.map((v: { voted_for_id: number; pote: number }) => ({
    voter_id,
    voted_for_id: v.voted_for_id,
    pote: v.pote,
  }))

  const { error: insertError } = await supabase.from('baba_votes').insert(rows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark as voted
  await supabase.from('baba_participants').update({ has_voted: true }).eq('id', voter_id)

  return NextResponse.json({ success: true })
}
