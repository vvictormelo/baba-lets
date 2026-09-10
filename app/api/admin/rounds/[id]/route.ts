import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const roundId = Number(params.id)
  if (!roundId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createServerClient()

  const { error } = await supabase.from('rounds').delete().eq('id', roundId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Limpa active_round_id se era esta rodada
  const { data: setting } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()

  if (setting?.value === String(roundId)) {
    await supabase
      .from('baba_settings')
      .upsert({ key: 'active_round_id', value: '' })
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
