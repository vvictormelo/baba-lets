'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateLong } from '@/lib/format'

interface HistoryEntry {
  round_id: number
  scheduled_date: string | null
  status: string | null
  attendance: 'confirmed' | 'absent' | 'suplente' | null
  is_novice: boolean
  pote: number | null
  team: number | null
  active: boolean
}

interface PoteEntry {
  pote: number
  player_id: number
  name: string
}

interface ActiveRound {
  id: number
  scheduled_date: string
  status: string
  confirmados: number
  potes: PoteEntry[]
}

interface HistoricoData {
  active_round_id: number | null
  active_round: ActiveRound | null
  attendance_status: 'confirmed' | 'absent' | null
  history: HistoryEntry[]
}

interface PlayerItem { id: number; name: string }

interface ListaPresenca {
  round: { id: number; scheduled_date: string; status: string } | null
  confirmados: PlayerItem[]
  suplentes: PlayerItem[]
  ausentes: PlayerItem[]
  pendentes: PlayerItem[]
}

const POTE_BADGE: Record<number, string> = {
  1: 'bg-blue-900 text-white',
  2: 'bg-blue-700 text-white',
  3: 'bg-blue-500 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-700',
}

const TEAM_COLOR: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800 border border-blue-200',
  2: 'bg-sky-100 text-sky-800 border border-sky-200',
  3: 'bg-orange-100 text-orange-800 border border-orange-200',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Em preparação',
  open: 'Aberta',
  closed: 'Encerrada',
  drawn: 'Sorteada',
}

const ATTENDANCE_LABEL: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Jogou', className: 'bg-blue-100 text-blue-700' },
  absent: { label: 'Ausente', className: 'bg-red-100 text-red-600' },
  suplente: { label: 'Suplente', className: 'bg-yellow-100 text-yellow-700' },
}

export default function PainelPage() {
  const router = useRouter()
  const [voterId, setVoterId] = useState<number | null>(null)
  const [voterName, setVoterName] = useState('')
  const [data, setData] = useState<HistoricoData | null>(null)
  const [lista, setLista] = useState<ListaPresenca | null>(null)
  const [voteCount, setVoteCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [listaAberta, setListaAberta] = useState(false)

  const loadData = useCallback(async (id: number) => {
    const [hist, votes, presenca] = await Promise.all([
      fetch(`/api/meu-historico?player_id=${id}`).then(r => r.json()),
      fetch(`/api/meus-votos?voter_id=${id}`).then(r => r.json()),
      fetch('/api/lista-presenca').then(r => r.json()),
    ])
    setData(hist)
    setVoteCount(Array.isArray(votes) ? votes.length : 0)
    setLista(presenca)
  }, [])

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    const numId = Number(id)
    setVoterId(numId)
    setVoterName(name)
    loadData(numId).then(() => setLoading(false))
  }, [router, loadData])

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
      setError(result.error || 'Erro ao processar')
    } else {
      if (result.suplente) {
        setMessage('Você está na lista de suplentes. Aguarde uma vaga!')
      } else {
        setMessage(confirmar ? 'Presença confirmada!' : 'Presença cancelada.')
      }
      await loadData(voterId)
      setTimeout(() => setMessage(''), 4000)
    }
    setCheckingIn(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  const activeRound = data?.active_round ?? null
  const activeEntry = data?.history.find(h => h.active) ?? null
  const pastEntries = data?.history.filter(h => !h.active) ?? []
  const isConfirmed = !!activeEntry && activeEntry.attendance === 'confirmed'
  const isSuplente = data?.attendance_status === 'confirmed' && !isConfirmed
  const isAbsent = data?.attendance_status === 'absent'
  const roundClosed = activeRound?.status === 'drawn' || activeRound?.status === 'closed'
  const vagas = activeRound ? 18 - activeRound.confirmados : 0

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
          <div className="bg-blue-50 border border-blue-300 text-blue-800 rounded-xl px-4 py-3 text-sm text-center font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Card da rodada ativa */}
        {activeRound ? (
          <div className={`rounded-2xl border-2 p-5 transition-colors ${
            isConfirmed ? 'border-blue-500 bg-blue-50'
            : isSuplente ? 'border-yellow-400 bg-yellow-50'
            : isAbsent ? 'border-red-300 bg-red-50'
            : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Próxima rodada</p>
                <p className="font-bold text-gray-900 text-lg leading-tight">
                  {formatDateLong(activeRound.scheduled_date)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    activeRound.status === 'drawn' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {STATUS_LABEL[activeRound.status] ?? activeRound.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {activeRound.confirmados}/18 confirmados
                    {!isConfirmed && !isSuplente && vagas > 0 && !roundClosed && (
                      <span className="text-blue-600 font-medium"> · {vagas} vaga{vagas !== 1 ? 's' : ''}</span>
                    )}
                    {!isConfirmed && !isSuplente && vagas === 0 && !roundClosed && (
                      <span className="text-red-500 font-medium"> · lotado</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 text-center">
                {isConfirmed ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl">✓</div>
                    <p className="text-xs text-blue-700 font-medium mt-1">Confirmado</p>
                  </>
                ) : isSuplente ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xl">⏳</div>
                    <p className="text-xs text-yellow-700 font-medium mt-1">Suplente</p>
                  </>
                ) : isAbsent ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-400 flex items-center justify-center text-white text-xl">✗</div>
                    <p className="text-xs text-red-600 font-medium mt-1">Ausente</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">?</div>
                    <p className="text-xs text-gray-400 mt-1">Pendente</p>
                  </>
                )}
              </div>
            </div>

            {isConfirmed && (activeEntry?.pote || activeEntry?.team) && (
              <div className="flex items-center gap-2 mb-4">
                {activeEntry.pote && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${POTE_BADGE[activeEntry.pote]}`}>
                    Pote {activeEntry.pote}
                  </span>
                )}
                {activeEntry.team && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${TEAM_COLOR[activeEntry.team]}`}>
                    Time {activeEntry.team}
                  </span>
                )}
              </div>
            )}

            {isSuplente && (
              <p className="text-xs text-yellow-700 mb-4">
                Você confirmou presença, mas a rodada está cheia. Se alguém cancelar, o admin pode te incluir.
              </p>
            )}

            {!roundClosed && (
              isConfirmed || isSuplente ? (
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
                  className="w-full h-12 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  {checkingIn ? 'Confirmando...' : isAbsent ? 'Mudar para confirmado' : 'Confirmar presença'}
                </button>
              )
            )}

            {roundClosed && isConfirmed && (
              <Link
                href="/resultado"
                className="block w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm text-center leading-[2.75rem]"
              >
                Ver resultado →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-gray-500 text-sm">Nenhuma rodada agendada no momento.</p>
            <p className="text-gray-400 text-xs mt-1">O admin vai cadastrar quando tiver data definida.</p>
          </div>
        )}

        {/* Lista de presença pública */}
        {lista?.round && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 text-left"
              onClick={() => setListaAberta(v => !v)}
            >
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Lista de presença</h2>
                <p className="text-xs text-gray-400">
                  {lista.confirmados.length} confirmados · {lista.suplentes.length > 0 ? `${lista.suplentes.length} suplentes · ` : ''}{lista.ausentes.length} ausentes · {lista.pendentes.length} sem resposta
                </p>
              </div>
              <span className="text-gray-400 text-xs ml-3">{listaAberta ? '▲' : '▼'}</span>
            </button>

            {listaAberta && (
              <div className="p-4 space-y-4">
                {lista.confirmados.length > 0 && (
                  <PresencaGrupo titulo="Confirmados" cor="green" jogadores={lista.confirmados} voterId={voterId} />
                )}
                {lista.suplentes.length > 0 && (
                  <PresencaGrupo titulo="Suplentes" cor="yellow" jogadores={lista.suplentes} voterId={voterId} />
                )}
                {lista.ausentes.length > 0 && (
                  <PresencaGrupo titulo="Ausentes" cor="red" jogadores={lista.ausentes} voterId={voterId} />
                )}
                {lista.pendentes.length > 0 && (
                  <PresencaGrupo titulo="Sem resposta" cor="gray" jogadores={lista.pendentes} voterId={voterId} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Potes da rodada ativa */}
        {activeRound && activeRound.potes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Potes da rodada</h2>
              <p className="text-xs text-gray-400">Distribuição definida pelo organizador</p>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(pote => {
                const jogadores = activeRound.potes.filter(p => p.pote === pote)
                if (jogadores.length === 0) return null
                return (
                  <div key={pote} className="rounded-xl border border-gray-200 p-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${POTE_BADGE[pote]}`}>
                      Pote {pote}
                    </span>
                    <div className="space-y-1">
                      {jogadores.map(j => (
                        <p
                          key={j.player_id}
                          className={`text-xs truncate ${j.player_id === voterId ? 'font-bold text-blue-700' : 'text-gray-700'}`}
                        >
                          {j.player_id === voterId ? '▶ ' : ''}{j.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/votar"
            className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">🗳️</span>
            <span className="text-sm font-semibold text-gray-900">Avaliar jogadores</span>
            <span className="text-xs text-gray-400">
              {voteCount > 0 ? `${voteCount} voto${voteCount !== 1 ? 's' : ''} lançado${voteCount !== 1 ? 's' : ''}` : 'Nenhum voto ainda'}
            </span>
          </Link>
          <Link
            href="/ranking"
            className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <span className="text-sm font-semibold text-gray-900">Ranking</span>
            <span className="text-xs text-gray-400">Ver classificação</span>
          </Link>
        </div>

        {/* Histórico de rodadas */}
        {pastEntries.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Histórico de rodadas</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pastEntries.map(entry => {
                const att = entry.attendance ? ATTENDANCE_LABEL[entry.attendance] : null
                return (
                  <div key={entry.round_id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(entry.scheduled_date)}</p>
                      <p className="text-xs text-gray-400">{STATUS_LABEL[entry.status ?? ''] ?? entry.status}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {att && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${att.className}`}>
                          {att.label}
                        </span>
                      )}
                      {entry.pote ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTE_BADGE[entry.pote]}`}>
                          Pote {entry.pote}
                        </span>
                      ) : null}
                      {entry.team ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TEAM_COLOR[entry.team]}`}>
                          Time {entry.team}
                        </span>
                      ) : null}
                      {entry.attendance === 'confirmed' && !entry.pote && !entry.team && (
                        <span className="text-xs text-gray-300">Aguardando sorteio</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PresencaGrupo({
  titulo,
  cor,
  jogadores,
  voterId,
}: {
  titulo: string
  cor: 'green' | 'yellow' | 'red' | 'gray'
  jogadores: PlayerItem[]
  voterId: number | null
}) {
  const colorMap = {
    green: { dot: 'bg-green-500', label: 'text-green-700', badge: 'bg-green-50 text-green-700' },
    yellow: { dot: 'bg-yellow-400', label: 'text-yellow-700', badge: 'bg-yellow-50 text-yellow-700' },
    red: { dot: 'bg-red-400', label: 'text-red-600', badge: 'bg-red-50 text-red-600' },
    gray: { dot: 'bg-gray-300', label: 'text-gray-500', badge: 'bg-gray-50 text-gray-500' },
  }
  const c = colorMap[cor]

  return (
    <div>
      <p className={`text-xs font-semibold ${c.label} mb-2 flex items-center gap-1.5`}>
        <span className={`w-2 h-2 rounded-full inline-block ${c.dot}`} />
        {titulo} ({jogadores.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {jogadores.map(j => (
          <span
            key={j.id}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.badge} ${j.id === voterId ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            {j.name}
          </span>
        ))}
      </div>
    </div>
  )
}
