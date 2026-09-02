'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PersonResult {
  name: string
  votes: number
}

interface PoteResult {
  pote: number
  ranking: PersonResult[]
}

const POTE_COLORS: Record<number, { badge: string; bg: string; border: string; bar: string }> = {
  1: { badge: 'bg-green-600', bg: 'bg-green-50', border: 'border-green-300', bar: 'bg-green-500' },
  2: { badge: 'bg-green-700', bg: 'bg-green-50', border: 'border-green-400', bar: 'bg-green-600' },
  3: { badge: 'bg-green-800', bg: 'bg-green-50', border: 'border-green-500', bar: 'bg-green-700' },
  4: { badge: 'bg-gray-600',  bg: 'bg-gray-50',  border: 'border-gray-300',  bar: 'bg-gray-500'  },
  5: { badge: 'bg-gray-700',  bg: 'bg-gray-50',  border: 'border-gray-400',  bar: 'bg-gray-600'  },
  6: { badge: 'bg-gray-800',  bg: 'bg-gray-50',  border: 'border-gray-500',  bar: 'bg-gray-700'  },
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ResultadosPage() {
  const [results, setResults] = useState<PoteResult[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/resultados')
      .then(r => r.json())
      .then(data => {
        setRevealed(data.revealed)
        if (data.revealed) setResults(data.results)
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

  if (!revealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Resultados ainda não revelados</h1>
          <p className="text-gray-500 mb-6">Aguarde o admin liberar os resultados.</p>
          <Link href="/" className="text-green-600 hover:underline text-sm">Voltar ao início</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900">🏆 Resultados do Baba Lets</h1>
          <p className="text-gray-500 text-sm mt-1">Ranking de pontos por pote</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {results?.map(poteResult => {
          const c = POTE_COLORS[poteResult.pote]
          const maxVotes = poteResult.ranking[0]?.votes || 1
          const hasVotes = poteResult.ranking.length > 0

          return (
            <div key={poteResult.pote} className={`rounded-2xl border-2 ${c.bg} ${c.border} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`${c.badge} text-white font-bold px-3 py-1 rounded-full text-sm`}>
                  Pote {poteResult.pote}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {poteResult.ranking.length} candidato{poteResult.ranking.length !== 1 ? 's' : ''}
                </span>
              </div>

              {!hasVotes ? (
                <p className="text-sm text-gray-400 italic text-center py-2">Nenhum voto ainda</p>
              ) : (
                <div className="space-y-2">
                  {poteResult.ranking.map((person, i) => (
                    <div key={person.name} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base w-6 text-center">
                            {i < 3 ? MEDALS[i] : `${i + 1}º`}
                          </span>
                          <span className={`text-sm font-semibold ${i < 3 ? 'text-gray-900' : 'text-gray-600'}`}>
                            {person.name}
                          </span>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${i === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {person.votes} {person.votes === 1 ? 'ponto' : 'pontos'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            i === 0 ? c.bar : i < 3 ? 'bg-gray-400' : 'bg-gray-200'
                          }`}
                          style={{ width: `${(person.votes / maxVotes) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
