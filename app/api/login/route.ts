import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { participant_id, pin } = await req.json()

  if (!participant_id || !pin) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('baba_participants')
    .select('id, name, pin, has_voted')
    .eq('id', participant_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
  }

  if (data.pin !== String(pin)) {
    return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 })
  }

  return NextResponse.json({ id: data.id, name: data.name, has_voted: data.has_voted })
}
