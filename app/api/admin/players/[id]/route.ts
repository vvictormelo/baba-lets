import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const id = Number(params.id)
  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) {
    patch.name = body.name.trim()
  }
  if (typeof body.active === 'boolean') {
    patch.active = body.active
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('players')
    .update(patch)
    .eq('id', id)
    .select('id, name, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
