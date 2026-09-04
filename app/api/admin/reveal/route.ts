import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { reveal } = await req.json()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('baba_settings')
    .upsert({ key: 'results_revealed', value: reveal ? 'true' : 'false' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, revealed: reveal }, { headers: { 'Cache-Control': 'no-store' } })
}
