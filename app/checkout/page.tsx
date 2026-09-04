'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: number
  name: string
  vote_count: number
}

interface VoteEntry {
  votee_id: number
  pote: number
  points: number
}

const POTE_COLORS: Record<number, { badge: string; bg: string; border: string }> = {
  1: { badge: 'bg-green-600 text-white', bg: 'bg-green-50', border: 'border-green-200' },
  2: { badge: 'bg-green-500 text-white', bg: 'bg-green-50', border: 'border-green-200' },
  3: { badge: 'bg-green-400 text-white', bg: 'bg-green-50', border: 'border-green-200' },
  4: { badge: 'bg-gray-500 text-white', bg: 'bg-gray-50', border: 'border-gray-200' },
  5: { badge: 'bg-gray-400 text-white', bg: 'bg-gray-50', border: 'border-gray-200' },
  6: { badge: 'bg-gray-300 text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
}

const POTE_POINTS: Record<number, number> = { 1: 18, 2: 12, 3: 10, 4: 6, 5: 3, 6: 1 }

export default function CheckoutPage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState('')
  const [voterId, setVoterId] = useState<number | null>(null)
  const [votes, setVotes] = useState<VoteEntry[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    setVoterId(Number(id))
    setVoterName(name)

    Promise.all([
      fetch(`/api/meus-votos?voter_id=${id}`).then(r => r.json()),
      fetch('/api/players').then(r => r.json()),
    ]).then(([votesData, playersData]) => {
      setVotes(votesData)
      setPlayers(playersData)
      setLoading(false)
    })
  }, [router])

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  // Agrupa votos por pote, ordenado por pote
  const byPote: Record<number, VoteEntry[]> = {}
  for (const v of votes) {
    if (!byPote[v.pote]) byPote[v.pote] = []
    byPote[v.pote].push(v)
  }

  const totalAvaliados = votes.length
  const totalJogadores = players.length
  const naoAvaliados = players.filter(p => p.id !== voterId && !votes.find(v => v.votee_id === p.id))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (votes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 gap-4">
        <p className="text-gray-500">Você ainda não avaliou nenhum jogador.</p>
        <Link href="/votar" className="text-green-600 hover:underline text-sm">← Ir para votação</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Resumo dos votos</h1>
            <p className="text-sm text-gray-500">{voterName}</p>
          </div>
          <Link href="/votar" className="text-sm text-green-600 hover:underline">
            ← Editar
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Placar de avaliações */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Jogadores avaliados</p>
            <p className="text-3xl font-bold text-gray-900">
              {totalAvaliados}
              <span className="text-lg font-normal text-gray-400">/{totalJogadores}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="w-20 h-20 relative">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#16a34a" strokeWidth="3"
                  strokeDasharray={`${(totalAvaliados / totalJogadores) * 100} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-700">
                {Math.round((totalAvaliados / totalJogadores) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Votos por pote */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(pote => {
            const c = POTE_COLORS[pote]
            const entries = byPote[pote] || []
            if (entries.length === 0) return null
            return (
              <div key={pote} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                    Pote {pote}
                  </span>
                  <span className="text-xs text-gray-400">
                    {POTE_POINTS[pote]} pts · {entries.length} jogador{entries.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entries.map(v => (
                    <span
                      key={v.votee_id}
                      className="bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200"
                    >
                      {playerMap[v.votee_id]?.name ?? `#${v.votee_id}`}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Não avaliados */}
        {naoAvaliados.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Ainda não avaliados ({naoAvaliados.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {naoAvaliados.map(p => (
                <span key={p.id} className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2 pb-6">
          <Link
            href="/painel"
            className="block w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-center leading-[3rem]"
          >
            Concluído →
          </Link>
          <Link
            href="/votar"
            className="block w-full h-11 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors text-center leading-[2.75rem] text-sm"
          >
            Continuar avaliando
          </Link>
        </div>
      </div>
    </div>
  )
}
