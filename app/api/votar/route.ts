import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { POTE_POINTS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const schema = z.object({
  voter_id: z.number().int().positive(),
  votes: z
    .array(
      z.object({
        votee_id: z.number().int().positive(),
        pote: z.number().int().min(1).max(6),
      })
    )
    .min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { voter_id, votes } = parsed.data

  if (votes.some(v => v.votee_id === voter_id)) {
    return NextResponse.json({ error: 'Não pode votar em si mesmo' }, { status: 400 })
  }

  const supabase = createServerClient()

  const [{ data: voter }, { data: roundSetting }] = await Promise.all([
    supabase.from('players').select('id').eq('id', voter_id).eq('active', true).single(),
    supabase.from('baba_settings').select('value').eq('key', 'active_round_id').single(),
  ])

  if (!voter) {
    return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
  }

  const round_id = roundSetting?.value ? Number(roundSetting.value) : null
  if (!round_id) {
    return NextResponse.json({ error: 'Nenhuma rodada ativa' }, { status: 400 })
  }

  // Busca votos existentes desta rodada para registrar a mudança no histórico
  const voteeIds = votes.map(v => v.votee_id)
  const { data: existing } = await supabase
    .from('votes')
    .select('votee_id, pote, points')
    .eq('round_id', round_id)
    .eq('voter_id', voter_id)
    .in('votee_id', voteeIds)

  const prevMap = Object.fromEntries(
    (existing || []).map(v => [v.votee_id, { pote: v.pote, points: v.points }])
  )

  const rows = votes.map(v => ({
    round_id,
    voter_id,
    votee_id: v.votee_id,
    pote: v.pote,
    points: POTE_POINTS[v.pote],
  }))

  const { error } = await supabase
    .from('votes')
    .upsert(rows, { onConflict: 'round_id,voter_id,votee_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Grava histórico de cada voto (novo ou alterado)
  const historyRows = votes.map(v => ({
    round_id,
    voter_id,
    votee_id: v.votee_id,
    pote: v.pote,
    points: POTE_POINTS[v.pote],
    prev_pote: prevMap[v.votee_id]?.pote ?? null,
    prev_points: prevMap[v.votee_id]?.points ?? null,
  }))

  await supabase.from('vote_history').insert(historyRows)

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
