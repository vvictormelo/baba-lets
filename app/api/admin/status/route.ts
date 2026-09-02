import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const adminPassword = req.headers.get('x-admin-password')
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: participants } = await supabase
    .from('baba_participants')
    .select('name, has_voted')
    .order('name')

  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'results_revealed')
    .single()

  const all = participants || []
  const voted = all.filter(p => p.has_voted)
  const notVoted = all.filter(p => !p.has_voted)

  return NextResponse.json({
    total: all.length,
    voted: voted.length,
    voted_list: voted.map(p => p.name),
    not_voted: notVoted.map(p => p.name),
    results_revealed: setting?.value === 'true',
  })
}
