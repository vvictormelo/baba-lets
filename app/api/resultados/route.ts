import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'results_revealed')
    .single()

  if (setting?.value !== 'true') {
    return NextResponse.json({ revealed: false })
  }

  // Aggregate votes per person per pote
  const { data: votes, error } = await supabase
    .from('baba_votes')
    .select('voted_for_id, pote, baba_participants!voted_for_id(name)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build results
  const poteMap: Record<number, Record<number, { name: string; votes: number }>> = {}
  for (let p = 1; p <= 6; p++) poteMap[p] = {}

  type VoteRow = { voted_for_id: number; pote: number; baba_participants: { name: string } | { name: string }[] | null }
  for (const v of votes as unknown as VoteRow[]) {
    const bp = v.baba_participants
    const name = Array.isArray(bp) ? bp[0]?.name : bp?.name
    if (!name) continue
    if (!poteMap[v.pote][v.voted_for_id]) {
      poteMap[v.pote][v.voted_for_id] = { name, votes: 0 }
    }
    poteMap[v.pote][v.voted_for_id].votes++
  }

  const results = [1, 2, 3, 4, 5, 6].map(pote => ({
    pote,
    ranking: Object.values(poteMap[pote]).sort((a, b) => b.votes - a.votes),
  }))

  return NextResponse.json({ revealed: true, results })
}
