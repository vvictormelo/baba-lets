'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/format'
import { PlayerLayout } from '@/components/PlayerLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface TeamEntry {
  team: number; player_id: number; pote: number; players: { id: number; name: string }
}
interface PotEntry {
  player_id: number; pote: number; players: { id: number; name: string }
}
interface ResultData {
  revealed: boolean
  round?: { id: number; scheduled_date: string; status: string }
  teams?: TeamEntry[]
  pots?: PotEntry[]
}

const POTE_CLS: Record<number, string> = {
  1: 'bg-blue-900 text-white border-0',
  2: 'bg-blue-700 text-white border-0',
  3: 'bg-blue-500 text-white border-0',
  4: 'bg-slate-500 text-white border-0',
  5: 'bg-slate-400 text-white border-0',
  6: 'bg-slate-200 text-slate-700 border-0',
}

const TEAM_HEADER = ['bg-blue-700 text-white', 'bg-sky-500 text-white', 'bg-orange-500 text-white']
const TEAM_BORDER = ['border-blue-600', 'border-sky-400', 'border-orange-400']

export default function ResultadoPage() {
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/resultado').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <PlayerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </PlayerLayout>
    )
  }

  if (!data?.revealed) {
    return (
      <PlayerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold mb-2">Resultado ainda não revelado</h1>
          <p className="text-muted-foreground text-sm">O admin vai revelar quando o sorteio estiver pronto.</p>
        </div>
      </PlayerLayout>
    )
  }

  const { round, teams = [], pots = [] } = data

  const byTeam: Record<number, TeamEntry[]> = {}
  for (const e of teams) { if (!byTeam[e.team]) byTeam[e.team] = []; byTeam[e.team].push(e) }

  const byPote: Record<number, PotEntry[]> = {}
  for (const e of pots) { if (!byPote[e.pote]) byPote[e.pote] = []; byPote[e.pote].push(e) }

  return (
    <PlayerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">⚽ Resultado do sorteio</h1>
          {round?.scheduled_date && (
            <p className="text-sm text-muted-foreground">{formatDate(round.scheduled_date)}</p>
          )}
        </div>

        {/* Times */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Times sorteados</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1,2,3].map(team => (
              <div key={team} className={`rounded-2xl border-2 overflow-hidden ${TEAM_BORDER[team-1]}`}>
                <div className={`px-4 py-2 font-bold text-center text-sm ${TEAM_HEADER[team-1]}`}>
                  Time {team}
                </div>
                <div className="p-3 space-y-1.5 bg-card">
                  {(byTeam[team] || []).sort((a,b) => a.pote - b.pote).map(entry => (
                    <div key={entry.player_id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium">{entry.players.name}</span>
                      <Badge className={`text-xs ${POTE_CLS[entry.pote]}`}>P{entry.pote}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Potes */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Composição dos potes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(pote => (
              <Card key={pote}>
                <CardContent className="pt-3 pb-3">
                  <Badge className={`text-xs mb-2 inline-block ${POTE_CLS[pote]}`}>Pote {pote}</Badge>
                  <div className="space-y-0.5">
                    {(byPote[pote] || []).map(e => (
                      <p key={e.player_id} className="text-sm truncate">{e.players.name}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PlayerLayout>
  )
}
