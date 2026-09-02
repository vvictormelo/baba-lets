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
    return NextResponse.json({ revealed: false }, { headers: { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store' } })
  }

  const [{ data: votes, error }, { data: participants }] = await Promise.all([
    supabase.from('baba_votes').select('voted_for_id, pote'),
    supabase.from('baba_participants').select('id, name'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nameMap: Record<number, string> = {}
  for (const p of participants ?? []) nameMap[p.id] = p.name

  // Conta votos por pessoa por pote
  const voteCounts: Record<number, Record<number, number>> = {}
  for (const v of votes ?? []) {
    if (!voteCounts[v.voted_for_id]) voteCounts[v.voted_for_id] = {}
    voteCounts[v.voted_for_id][v.pote] = (voteCounts[v.voted_for_id][v.pote] || 0) + 1
  }

  // Gera todos os candidatos (pessoa × pote) e ordena por votos desc
  const candidates: { personId: number; pote: number; votes: number }[] = []
  for (const [personIdStr, poteCounts] of Object.entries(voteCounts)) {
    const personId = Number(personIdStr)
    for (const [poteStr, count] of Object.entries(poteCounts)) {
      candidates.push({ personId, pote: Number(poteStr), votes: count })
    }
  }
  // Ordena: mais votos primeiro; em empate, pote menor tem prioridade (pote mais forte)
  candidates.sort((a, b) => b.votes - a.votes || a.pote - b.pote)

  // Draft greedy: atribui cada pessoa ao melhor pote disponível (max 3 por pote)
  const poteAssignments: Record<number, { name: string; votes: number }[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  const assignedPeople = new Set<number>()
  const fullPotes = new Set<number>()

  for (const c of candidates) {
    if (assignedPeople.has(c.personId)) continue
    if (fullPotes.has(c.pote)) continue
    const name = nameMap[c.personId]
    if (!name) continue

    poteAssignments[c.pote].push({ name, votes: c.votes })
    assignedPeople.add(c.personId)
    if (poteAssignments[c.pote].length >= 3) fullPotes.add(c.pote)
  }

  const results = [1, 2, 3, 4, 5, 6].map(pote => ({
    pote,
    ranking: poteAssignments[pote].sort((a, b) => b.votes - a.votes),
  }))

  return NextResponse.json(
    { revealed: true, results },
    { headers: { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store' } }
  )
}
