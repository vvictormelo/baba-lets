import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getActiveRoundId } from '@/lib/rounds'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  voter_id: z.number().int().positive(),
  round_id: z.number().int().positive(),
  mvp_id: z.number().int().positive(),
  pereba_id: z.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const roundIdParam = req.nextUrl.searchParams.get('round_id')
  const voterIdParam = req.nextUrl.searchParams.get('voter_id')

  const supabase = createServerClient()
  const roundId = roundIdParam ? Number(roundIdParam) : await getActiveRoundId(supabase)
  if (!roundId) {
    return NextResponse.json({ mvp: [], pereba: [], my_vote: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: votes } = await supabase
    .from('round_awards')
    .select('voter_id, mvp_id, pereba_id, mvp:mvp_id(name), pereba:pereba_id(name)')
    .eq('round_id', roundId)

  const mvpCount: Record<number, { name: string; votes: number }> = {}
  const perebaCount: Record<number, { name: string; votes: number }> = {}

  for (const v of votes || []) {
    if (v.mvp_id) {
      if (!mvpCount[v.mvp_id]) mvpCount[v.mvp_id] = { name: (v.mvp as unknown as { name: string })?.name ?? '', votes: 0 }
      mvpCount[v.mvp_id].votes++
    }
    if (v.pereba_id) {
      if (!perebaCount[v.pereba_id]) perebaCount[v.pereba_id] = { name: (v.pereba as unknown as { name: string })?.name ?? '', votes: 0 }
      perebaCount[v.pereba_id].votes++
    }
  }

  const mvp = Object.entries(mvpCount)
    .map(([id, d]) => ({ player_id: Number(id), name: d.name, votes: d.votes }))
    .sort((a, b) => b.votes - a.votes)

  const pereba = Object.entries(perebaCount)
    .map(([id, d]) => ({ player_id: Number(id), name: d.name, votes: d.votes }))
    .sort((a, b) => b.votes - a.votes)

  const myVote = voterIdParam
    ? (votes || []).find(v => v.voter_id === Number(voterIdParam)) ?? null
    : null

  return NextResponse.json(
    { round_id: roundId, mvp, pereba, my_vote: myVote ? { mvp_id: myVote.mvp_id, pereba_id: myVote.pereba_id } : null },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { voter_id, round_id, mvp_id, pereba_id } = parsed.data

  if (mvp_id === voter_id || pereba_id === voter_id) {
    return NextResponse.json({ error: 'Não pode votar em si mesmo' }, { status: 400 })
  }
  if (mvp_id === pereba_id) {
    return NextResponse.json({ error: 'MVP e Pereba precisam ser jogadores diferentes' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: round } = await supabase
    .from('rounds')
    .select('status')
    .eq('id', round_id)
    .single()

  if (!round || (round.status !== 'drawn' && round.status !== 'closed')) {
    return NextResponse.json({ error: 'Rodada não está disponível para votação' }, { status: 409 })
  }

  const { error } = await supabase
    .from('round_awards')
    .upsert(
      { round_id, voter_id, mvp_id, pereba_id, updated_at: new Date().toISOString() },
      { onConflict: 'round_id,voter_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
