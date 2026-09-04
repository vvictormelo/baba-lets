'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Player {
  id: number
  name: string
  vote_count: number
}

interface VoteMap {
  [votee_id: number]: number // pote
}

const POTE_LABELS: Record<number, string> = {
  1: 'Pote 1',
  2: 'Pote 2',
  3: 'Pote 3',
  4: 'Pote 4',
  5: 'Pote 5',
  6: 'Pote 6',
}

const POTE_COLORS: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-green-500 text-white',
  3: 'bg-green-400 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-800',
}

export default function VotarPage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState('')
  const [voterId, setVoterId] = useState<number | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [votes, setVotes] = useState<VoteMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    setVoterId(Number(id))
    setVoterName(name)

    Promise.all([
      fetch('/api/players').then(r => r.json()),
      fetch(`/api/meus-votos?voter_id=${id}`).then(r => r.json()),
    ]).then(([playersData, votesData]) => {
      setPlayers((playersData as Player[]).filter(p => p.id !== Number(id)))
      const map: VoteMap = {}
      for (const v of votesData as { votee_id: number; pote: number }[]) {
        map[v.votee_id] = v.pote
      }
      setVotes(map)
      setLoading(false)
    })
  }, [router])

  const setVote = useCallback((votee_id: number, pote: number | null) => {
    setVotes(prev => {
      const next = { ...prev }
      if (pote === null) {
        delete next[votee_id]
      } else {
        next[votee_id] = pote
      }
      return next
    })
  }, [])

  async function handleSave() {
    if (!voterId || Object.keys(votes).length === 0) return
    setSaving(true)
    setError('')

    const voteArray = Object.entries(votes).map(([votee_id, pote]) => ({
      votee_id: Number(votee_id),
      pote,
    }))

    const res = await fetch('/api/votar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter_id: voterId, votes: voteArray }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao salvar')
      setSaving(false)
    } else {
      router.push('/checkout')
    }
  }

  const votedCount = Object.keys(votes).length
  const totalPlayers = players.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gray-900">⚽ Baba Lets</span>
            <span className="text-gray-400 text-sm ml-2">— {voterName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{votedCount}/{totalPlayers} avaliados</span>
            <button
              onClick={handleSave}
              disabled={saving || votedCount === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: totalPlayers ? `${(votedCount / totalPlayers) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Atribua um pote (1 = melhor, 6 = mais fraco) para cada jogador. Pode salvar a qualquer momento.
        </p>

        {/* Lista de jogadores */}
        <div className="space-y-2">
          {players.map(player => {
            const currentPote = votes[player.id] ?? null
            return (
              <div
                key={player.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {player.name}
                    </span>
                    {player.vote_count === 0 && (
                      <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                        Novato
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5, 6].map(pote => (
                      <button
                        key={pote}
                        onClick={() => setVote(player.id, currentPote === pote ? null : pote)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                          currentPote === pote
                            ? POTE_COLORS[pote]
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={POTE_LABELS[pote]}
                      >
                        {pote}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pb-6 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || votedCount === 0}
            className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
          >
            {saving ? 'Salvando...' : `Salvar ${votedCount} voto${votedCount !== 1 ? 's' : ''}`}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Você pode voltar aqui e alterar seus votos a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  )
}
