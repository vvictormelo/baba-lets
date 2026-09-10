import { SupabaseClient } from '@supabase/supabase-js'

export async function getActiveRoundId(supabase: SupabaseClient): Promise<number | null> {
  const { data } = await supabase
    .from('baba_settings')
    .select('value')
    .eq('key', 'active_round_id')
    .single()
  return data?.value ? Number(data.value) : null
}

export async function getActiveRound(supabase: SupabaseClient) {
  const roundId = await getActiveRoundId(supabase)
  if (!roundId) return null
  const { data } = await supabase
    .from('rounds')
    .select('id, scheduled_date, status')
    .eq('id', roundId)
    .single()
  return data as { id: number; scheduled_date: string; status: string } | null
}
