import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const adminPassword = req.headers.get('x-admin-password')
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { reveal } = await req.json()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('baba_settings')
    .upsert({ key: 'results_revealed', value: reveal ? 'true' : 'false' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, revealed: reveal })
}
