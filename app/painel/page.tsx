'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateLong } from '@/lib/format'

interface HistoryEntry {
  round_id: number
  scheduled_date: string | null
  status: string | null
  is_novice: boolean
  pote: number | null
  team: number | null
  active: boolean
}

interface HistoricoData {
  active_round_id: number | null
  history: HistoryEntry[]
}

const POTE_BADGE: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-green-500 text-white',
  3: 'bg-green-400 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-700',
}

const TEAM_COLOR: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-orange-100 text-orange-800',
}

export default function PainelPage() {
  const router = useRouter()
  const [voterId, setVoterId] = useState<number | null>(null)
  const [voterName, setVoterName] = useState('')
  const [data, setData] = useState<HistoricoData | null>(null)
  const [voteCount, setVoteCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    const numId = Number(id)
    setVoterId(numId)
    setVoterName(name)

    Promise.all([
      fetch(`/api/meu-historico?player_id=${id}`).then(r => r.json()),
      fetch(`/api/meus-votos?voter_id=${id}`).then(r => r.json()),
    ]).then(([hist, votes]) => {
      setData(hist)
      setVoteCount(Array.isArray(votes) ? votes.length : 0)
      setLoading(false)
    })
  }, [router])

  async function handleCheckin(confirmar: boolean) {
    if (!voterId) return
    setCheckingIn(true)
    setError('')
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: voterId, confirmar }),
    })
    const result = await res.json()
    if (!res.ok) {
      setError(result.error || 'Erro ao confirmar')
    } else {
      setMessage(confirmar ? 'Presença confirmada!' : 'Presença cancelada.')
      // Recarrega histórico
      const hist = await fetch(`/api/meu-historico?player_id=${voterId}`).then(r => r.json())
      setData(hist)
      setTimeout(() => setMessage(''), 3000)
    }
    setCheckingIn(false)
  }

  const activeEntry = data?.history.find(h => h.active)
  const pastEntries = data?.history.filter(h => !h.active) ?? []
  const hasActiveRound = !!data?.active_round_id
  const isConfirmed = !!activeEntry

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">⚽ Baba Lets</h1>
            <p className="text-sm text-gray-500">{voterName}</p>
          </div>
          <button
            onClick={() => { sessionStorage.clear(); router.replace('/') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm text-center font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Check-in rodada ativa */}
        {hasActiveRound ? (
          <div className={`rounded-2xl border-2 p-5 ${isConfirmed ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Próxima rodada</p>
                <p className="font-bold text-gray-900 text-base">
                  {activeEntry?.scheduled_date
                    ? formatDateLong(activeEntry.scheduled_date)
                    : 'Data a confirmar'}
                </p>
                {isConfirmed && activeEntry?.pote && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTE_BADGE[activeEntry.pote]}`}>
                      Pote {activeEntry.pote}
                    </span>
                    {activeEntry.team && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TEAM_COLOR[activeEntry.team]}`}>
                        Time {activeEntry.team}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {isConfirmed ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl mb-1">✓</div>
                    <p className="text-xs text-green-700 font-medium">Confirmado</p>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">?</div>
                )}
              </div>
            </div>

            {activeEntry?.status !== 'drawn' && (
              <div className="mt-4">
                {isConfirmed ? (
                  <button
                    onClick={() => handleCheckin(false)}
                    disabled={checkingIn}
                    className="w-full h-11 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
                  >
                    {checkingIn ? '...' : 'Cancelar presença'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckin(true)}
                    disabled={checkingIn}
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {checkingIn ? 'Confirmando...' : 'Confirmar presença'}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-sm">Nenhuma rodada agendada no momento.</p>
          </div>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/votar"
            className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1 hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">🗳️</span>
            <span className="text-sm font-semibold text-gray-900">Avaliar jogadores</span>
            <span className="text-xs text-gray-400">{voteCount} voto{voteCount !== 1 ? 's' : ''} lançado{voteCount !== 1 ? 's' : ''}</span>
          </Link>
          <Link
            href="/ranking"
            className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1 hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <span className="text-sm font-semibold text-gray-900">Ranking</span>
            <span className="text-xs text-gray-400">Ver classificação</span>
          </Link>
        </div>

        {/* Histórico */}
        {pastEntries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Histórico de check-ins</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pastEntries.map(entry => (
                <div key={entry.round_id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(entry.scheduled_date)}</p>
                    <p className="text-xs text-gray-400 capitalize">{entry.status === 'drawn' ? 'Sorteado' : entry.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.pote && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTE_BADGE[entry.pote]}`}>
                        Pote {entry.pote}
                      </span>
                    )}
                    {entry.team && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TEAM_COLOR[entry.team]}`}>
                        Time {entry.team}
                      </span>
                    )}
                    {!entry.pote && (
                      <span className="text-xs text-gray-300">Sem pote atribuído</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
