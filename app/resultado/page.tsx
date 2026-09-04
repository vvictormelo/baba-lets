'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/format'

interface TeamEntry {
  team: number
  player_id: number
  pote: number
  players: { id: number; name: string }
}

interface PotEntry {
  player_id: number
  pote: number
  players: { id: number; name: string }
}

interface ResultData {
  revealed: boolean
  round?: { id: number; scheduled_date: string; status: string }
  teams?: TeamEntry[]
  pots?: PotEntry[]
}

const POTE_BADGE: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-green-500 text-white',
  3: 'bg-green-400 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-700',
}

const TEAM_COLORS = [
  'border-green-400 bg-green-50',
  'border-blue-400 bg-blue-50',
  'border-orange-400 bg-orange-50',
]

const TEAM_HEADER = [
  'bg-green-500 text-white',
  'bg-blue-500 text-white',
  'bg-orange-500 text-white',
]

export default function ResultadoPage() {
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/resultado')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!data?.revealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Resultado ainda não revelado</h1>
        <p className="text-gray-500 mb-6 text-center">O admin vai revelar quando o sorteio estiver pronto.</p>
        <Link href="/" className="text-green-600 hover:underline text-sm">← Voltar ao início</Link>
      </div>
    )
  }

  const { round, teams = [], pots = [] } = data

  // Agrupa times
  const byTeam: Record<number, TeamEntry[]> = {}
  for (const entry of teams) {
    if (!byTeam[entry.team]) byTeam[entry.team] = []
    byTeam[entry.team].push(entry)
  }

  // Agrupa potes
  const byPote: Record<number, PotEntry[]> = {}
  for (const entry of pots) {
    if (!byPote[entry.pote]) byPote[entry.pote] = []
    byPote[entry.pote].push(entry)
  }

  const dateStr = formatDate(round?.scheduled_date)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">⚽ Resultado do Sorteio</h1>
            {dateStr && <p className="text-sm text-gray-500">{dateStr}</p>}
          </div>
          <Link href="/" className="text-sm text-green-600 hover:underline">← Início</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {/* Times */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Times sorteados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(team => (
              <div key={team} className={`rounded-2xl border-2 overflow-hidden ${TEAM_COLORS[team - 1]}`}>
                <div className={`px-4 py-2 font-bold text-center ${TEAM_HEADER[team - 1]}`}>
                  Time {team}
                </div>
                <div className="p-3 space-y-2">
                  {(byTeam[team] || []).sort((a, b) => a.pote - b.pote).map(entry => (
                    <div key={entry.player_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                      <span className="text-sm font-medium text-gray-900">{entry.players.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTE_BADGE[entry.pote]}`}>
                        P{entry.pote}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Potes */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Composição dos potes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(pote => (
              <div key={pote} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${POTE_BADGE[pote]}`}>
                  Pote {pote}
                </div>
                <div className="space-y-1">
                  {(byPote[pote] || []).map(entry => (
                    <div key={entry.player_id} className="text-sm text-gray-800 truncate">
                      {entry.players.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
