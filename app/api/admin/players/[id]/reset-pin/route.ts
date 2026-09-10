import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const playerId = Number(params.id)
  if (!playerId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase.from('players').update({ pin_hash: null }).eq('id', playerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
