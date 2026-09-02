import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { participant_id } = await req.json()

  if (!participant_id) {
    return NextResponse.json({ error: 'Selecione seu nome' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('baba_participants')
    .select('id, name, has_voted')
    .eq('id', participant_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, name: data.name, has_voted: data.has_voted })
}
