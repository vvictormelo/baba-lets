import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getActiveRoundId } from '@/lib/rounds'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  player_id: z.coerce.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({ player_id: req.nextUrl.searchParams.get('player_id') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'player_id obrigatório' }, { status: 400 })
  }
  const { player_id } = parsed.data

  const supabase = createServerClient()

  const activeRoundId = await getActiveRoundId(supabase)

  // Dados da rodada ativa
  let activeRound: {
    id: number
    scheduled_date: string
    status: string
    confirmados: number
    potes: { pote: number; player_id: number; name: string }[]
  } | null = null

  if (activeRoundId) {
    const [{ data: round }, { count }, { data: roundPots }] = await Promise.all([
      supabase.from('rounds').select('id, scheduled_date, status').eq('id', activeRoundId).single(),
      supabase.from('round_participants').select('*', { count: 'exact', head: true }).eq('round_id', activeRoundId),
      supabase.from('round_pots').select('pote, player_id, players(name)').eq('round_id', activeRoundId).order('pote'),
    ])
    if (round) {
      const potes = (roundPots || []).map(p => ({
        pote: p.pote,
        player_id: p.player_id,
        name: (p.players as unknown as { name: string })?.name ?? '',
      }))
      activeRound = { ...round, confirmados: count ?? 0, potes }
    }
  }

  // Presença declarada na rodada ativa
  let attendanceStatus: 'confirmed' | 'absent' | null = null
  if (activeRoundId) {
    const { data: att } = await supabase
      .from('round_attendance')
      .select('status')
      .eq('round_id', activeRoundId)
      .eq('player_id', player_id)
      .single()
    attendanceStatus = (att?.status as 'confirmed' | 'absent') ?? null
  }

  // Participações confirmadas (nos 18)
  const { data: participations } = await supabase
    .from('round_participants')
    .select('round_id, is_novice, rounds(id, scheduled_date, status)')
    .eq('player_id', player_id)

  // Todas as presenças/ausências declaradas (histórico completo)
  const { data: allAttendance } = await supabase
    .from('round_attendance')
    .select('round_id, status, rounds(id, scheduled_date, status)')
    .eq('player_id', player_id)

  // Pote e time em cada rodada
  const participatedRoundIds = (participations || []).map(p => p.round_id)
  const [{ data: pots }, { data: teams }] = participatedRoundIds.length
    ? await Promise.all([
        supabase.from('round_pots').select('round_id, pote').eq('player_id', player_id).in('round_id', participatedRoundIds),
        supabase.from('round_teams').select('round_id, team, pote').eq('player_id', player_id).in('round_id', participatedRoundIds),
      ])
    : [{ data: [] }, { data: [] }]

  const potMap = Object.fromEntries((pots || []).map(p => [p.round_id, p.pote]))
  const teamMap = Object.fromEntries((teams || []).map(t => [t.round_id, t.team]))
  const participantSet = new Set(participatedRoundIds)

  // Monta histórico unificado: participou + rodadas onde declarou ausência
  const roundsSeen = new Set<number>()
  const history: {
    round_id: number
    scheduled_date: string | null
    status: string | null
    attendance: 'confirmed' | 'absent' | 'suplente' | null
    is_novice: boolean
    pote: number | null
    team: number | null
    active: boolean
  }[] = []

  // Rodadas onde participou (nos 18)
  for (const p of participations || []) {
    if (roundsSeen.has(p.round_id)) continue
    roundsSeen.add(p.round_id)
    const round = p.rounds as unknown as { id: number; scheduled_date: string; status: string } | null
    history.push({
      round_id: p.round_id,
      scheduled_date: round?.scheduled_date ?? null,
      status: round?.status ?? null,
      attendance: 'confirmed',
      is_novice: p.is_novice,
      pote: potMap[p.round_id] ?? null,
      team: teamMap[p.round_id] ?? null,
      active: p.round_id === activeRoundId,
    })
  }

  // Rodadas onde declarou presença/ausência mas não está nos 18
  for (const att of allAttendance || []) {
    if (roundsSeen.has(att.round_id)) continue
    roundsSeen.add(att.round_id)
    const round = att.rounds as unknown as { id: number; scheduled_date: string; status: string } | null
    const isParticipant = participantSet.has(att.round_id)
    history.push({
      round_id: att.round_id,
      scheduled_date: round?.scheduled_date ?? null,
      status: round?.status ?? null,
      attendance: att.status === 'confirmed' && !isParticipant ? 'suplente' : (att.status as 'confirmed' | 'absent'),
      is_novice: false,
      pote: null,
      team: null,
      active: att.round_id === activeRoundId,
    })
  }

  history.sort((a, b) => {
    if (!a.scheduled_date) return 1
    if (!b.scheduled_date) return -1
    return b.scheduled_date.localeCompare(a.scheduled_date)
  })

  return NextResponse.json(
    { active_round_id: activeRoundId, active_round: activeRound, attendance_status: attendanceStatus, history },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
