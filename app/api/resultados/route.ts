import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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

  const [{ data: votes, error }, { data: participants }] = await Promise.all([
    supabase.from('baba_votes').select('voted_for_id, pote'),
    supabase.from('baba_participants').select('id, name'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nameMap: Record<number, string> = {}
  for (const p of participants ?? []) nameMap[p.id] = p.name

  const poteMap: Record<number, Record<number, { name: string; votes: number }>> = {}
  for (let p = 1; p <= 6; p++) poteMap[p] = {}

  for (const v of votes ?? []) {
    const name = nameMap[v.voted_for_id]
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
