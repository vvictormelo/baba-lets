import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const round_id = Number(params.id)
  const supabase = createServerClient()

  const { data: round } = await supabase
    .from('rounds')
    .select('status')
    .eq('id', round_id)
    .single()

  if (!round) {
    return NextResponse.json({ error: 'Rodada não encontrada' }, { status: 404 })
  }
  if (round.status !== 'drawn') {
    return NextResponse.json({ error: 'Só é possível encerrar uma rodada já sorteada' }, { status: 400 })
  }

  const { error } = await supabase
    .from('rounds')
    .update({ status: 'closed' })
    .eq('id', round_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
