'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PlayerRanking {
  id: number
  name: string
  total_points: number
  vote_count: number
  ranking_index: number
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ranking')
      .then(r => r.json())
      .then(data => {
        setRanking(data)
        setLoading(false)
      })
  }, [])

  const withVotes = ranking.filter(p => p.vote_count > 0)
  const noVotes = ranking.filter(p => p.vote_count === 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ranking Geral</h1>
            <p className="text-sm text-gray-500">Índice = média de pontos recebidos</p>
          </div>
          <Link href="/" className="text-sm text-green-600 hover:underline">← Início</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Tabela de pontuação */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Jogador</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Índice</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">Votos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">Pts total</th>
                  </tr>
                </thead>
                <tbody>
                  {withVotes.map((player, i) => (
                    <tr key={player.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}º</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{player.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-green-700 tabular-nums">
                          {Number(player.ranking_index).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                        {player.vote_count}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                        {player.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {noVotes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Sem votos recebidos
                </p>
                <div className="flex flex-wrap gap-2">
                  {noVotes.map(p => (
                    <span key={p.id} className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ranking.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Nenhum voto registrado ainda.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
