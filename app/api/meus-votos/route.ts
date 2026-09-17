import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const voter_id = req.nextUrl.searchParams.get('voter_id')
  if (!voter_id) {
    return NextResponse.json({ error: 'voter_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: roundSetting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  const round_id = roundSetting?.value ? Number(roundSetting.value) : null

  let query = supabase
    .from('votes')
    .select('votee_id, pote, points')
    .eq('voter_id', Number(voter_id))

  if (round_id) query = query.eq('round_id', round_id)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
