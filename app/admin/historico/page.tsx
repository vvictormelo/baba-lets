'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatDateLong } from '@/lib/format'

interface AttendancePlayer { name: string; status: string }

interface RoundAttendance {
  confirmed: number
  absent: number
  suplente: number
  players: AttendancePlayer[]
}

interface TeamEntry { team: number; player_id: number; pote: number; name: string }
interface PotEntry { player_id: number; pote: number; name: string }

interface RoundHistory {
  id: number
  scheduled_date: string
  status: string
  attendance: RoundAttendance
  teams: TeamEntry[]
  pots: PotEntry[]
}

const POTE_BADGE: Record<number, string> = {
  1: 'bg-blue-900 text-white',
  2: 'bg-blue-700 text-white',
  3: 'bg-blue-500 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-700',
}

const TEAM_HEADER = ['bg-blue-700 text-white', 'bg-sky-500 text-white', 'bg-orange-500 text-white']

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:  { label: 'Em preparação', cls: 'bg-gray-100 text-gray-500' },
  open:   { label: 'Aberta',        cls: 'bg-yellow-100 text-yellow-700' },
  drawn:  { label: 'Sorteada',      cls: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Encerrada',     cls: 'bg-green-100 text-green-700' },
}

const ATTENDANCE_COLOR: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  suplente:  'bg-yellow-100 text-yellow-700',
  absent:    'bg-red-100 text-red-600',
}

type Tab = 'times' | 'potes' | 'presenca'

export default function AdminHistoricoPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rounds, setRounds] = useState<RoundHistory[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Record<number, Tab>>({})

  async function fetchHistorico(pwd: string): Promise<boolean> {
    setLoading(true)
    const res = await fetch('/api/admin/historico', { headers: { 'x-admin-password': pwd } })
    if (res.ok) {
      const data = await res.json()
      setRounds(data.rounds || [])
      if (data.rounds?.length > 0) setExpandedId(data.rounds[0].id)
    }
    setLoading(false)
    return res.ok
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchHistorico(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [])

  function getTab(id: number): Tab {
    return activeTab[id] ?? 'times'
  }

  function setTab(id: number, tab: Tab) {
    setActiveTab(prev => ({ ...prev, [id]: tab }))
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Carregando...</div></div>
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-4">Acesso admin</h1>
          <form onSubmit={async e => {
            e.preventDefault()
            const ok = await fetchHistorico(password)
            if (ok) { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
            else setAuthError('Senha incorreta')
          }} className="space-y-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Senha admin"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {authError && <p className="text-red-600 text-sm">{authError}</p>}
            <button type="submit" className="w-full h-11 bg-blue-700 text-white font-semibold rounded-xl">Entrar</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Histórico de rodadas</h1>
            <p className="text-xs text-gray-400">{rounds.length} rodada{rounds.length !== 1 ? 's' : ''} registrada{rounds.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/admin" className="text-xs text-blue-600 hover:underline">← Admin</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {loading && <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>}
        {!loading && rounds.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhuma rodada registrada ainda.</p>
          </div>
        )}

        {rounds.map(round => {
          const st = STATUS_LABEL[round.status] ?? { label: round.status, cls: 'bg-gray-100 text-gray-500' }
          const isOpen = expandedId === round.id
          const tab = getTab(round.id)
          const byTeam: Record<number, TeamEntry[]> = {}
          for (const t of round.teams) {
            if (!byTeam[t.team]) byTeam[t.team] = []
            byTeam[t.team].push(t)
          }
          const byPote: Record<number, PotEntry[]> = {}
          for (const p of round.pots) {
            if (!byPote[p.pote]) byPote[p.pote] = []
            byPote[p.pote].push(p)
          }
          const hasTeams = round.teams.length > 0
          const hasPots  = round.pots.length > 0
          const hasAttendance = round.attendance.players.length > 0

          return (
            <div key={round.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header da rodada */}
              <button
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 text-left"
                onClick={() => setExpandedId(isOpen ? null : round.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{formatDateLong(round.scheduled_date)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      <span className="text-xs text-gray-400">
                        {round.attendance.confirmed} jogaram
                        {round.attendance.suplente > 0 ? ` · ${round.attendance.suplente} suplentes` : ''}
                        {round.attendance.absent > 0 ? ` · ${round.attendance.absent} ausentes` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-xs ml-4">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {/* Tabs */}
                  {(hasTeams || hasPots || hasAttendance) && (
                    <div className="flex border-b border-gray-100">
                      {hasTeams && (
                        <button
                          onClick={() => setTab(round.id, 'times')}
                          className={`px-4 py-2.5 text-xs font-semibold transition-colors ${tab === 'times' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Times
                        </button>
                      )}
                      {hasPots && (
                        <button
                          onClick={() => setTab(round.id, 'potes')}
                          className={`px-4 py-2.5 text-xs font-semibold transition-colors ${tab === 'potes' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Potes
                        </button>
                      )}
                      {hasAttendance && (
                        <button
                          onClick={() => setTab(round.id, 'presenca')}
                          className={`px-4 py-2.5 text-xs font-semibold transition-colors ${tab === 'presenca' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Presença
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Times */}
                    {tab === 'times' && hasTeams && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1, 2, 3].map(team => (
                          <div key={team} className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className={`px-3 py-2 text-xs font-bold text-center ${TEAM_HEADER[team - 1]}`}>
                              Time {team}
                            </div>
                            <div className="p-2 space-y-1">
                              {(byTeam[team] || []).map(e => (
                                <div key={e.player_id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                                  <span className="text-xs text-gray-800 truncate">{e.name}</span>
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${POTE_BADGE[e.pote]}`}>
                                    P{e.pote}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Potes */}
                    {tab === 'potes' && hasPots && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(pote => {
                          const jogadores = byPote[pote] || []
                          if (!jogadores.length) return null
                          return (
                            <div key={pote} className="rounded-xl border border-gray-200 p-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${POTE_BADGE[pote]}`}>
                                Pote {pote}
                              </span>
                              <div className="space-y-0.5">
                                {jogadores.map(j => (
                                  <p key={j.player_id} className="text-xs text-gray-700 truncate">{j.name}</p>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Presença */}
                    {tab === 'presenca' && hasAttendance && (
                      <div className="space-y-3">
                        {(['confirmed', 'suplente', 'absent'] as const).map(status => {
                          const players = round.attendance.players.filter(p => p.status === status)
                          if (!players.length) return null
                          const labels: Record<string, string> = { confirmed: 'Jogaram', suplente: 'Suplentes', absent: 'Ausentes' }
                          return (
                            <div key={status}>
                              <p className="text-xs font-semibold text-gray-500 mb-1.5">{labels[status]} ({players.length})</p>
                              <div className="flex flex-wrap gap-1.5">
                                {players.map(p => (
                                  <span key={p.name} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ATTENDANCE_COLOR[status]}`}>
                                    {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {!hasTeams && !hasPots && !hasAttendance && (
                      <p className="text-sm text-gray-400 text-center py-4">Nenhum dado registrado para esta rodada.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
