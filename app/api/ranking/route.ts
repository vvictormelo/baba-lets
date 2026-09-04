import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('player_ranking')
    .select('id, name, total_points, vote_count, ranking_index')
    .eq('active', true)
    .order('ranking_index', { ascending: false })
    .order('vote_count', { ascending: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
