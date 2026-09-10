'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/format'

type AttendanceStatus = 'confirmed' | 'absent' | 'suplente' | 'pending'

interface PlayerAttendance {
  id: number
  name: string
  status: AttendanceStatus
}

interface RoundData {
  id: number
  scheduled_date: string
  status: string
  players: PlayerAttendance[]
  stats: { confirmed: number; suplente: number; absent: number; pending: number }
}

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  confirmed: 'bg-green-100 text-green-700',
  suplente: 'bg-yellow-100 text-yellow-700',
  absent: 'bg-red-100 text-red-600',
  pending: 'bg-gray-100 text-gray-400',
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  confirmed: 'Confirmado',
  suplente: 'Suplente',
  absent: 'Ausente',
  pending: 'Sem resposta',
}

const ROUND_STATUS_LABEL: Record<string, string> = {
  draft: 'Em preparação',
  open: 'Aberta',
  closed: 'Encerrada',
  drawn: 'Sorteada',
}

export default function AdminPresencaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all')

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchPresenca(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [])

  async function fetchPresenca(pwd: string): Promise<boolean> {
    setLoading(true)
    const res = await fetch('/api/admin/presenca', { headers: { 'x-admin-password': pwd } })
    if (res.ok) {
      const data = await res.json()
      setRounds(data.rounds || [])
      if (data.rounds?.length > 0) setExpandedRound(data.rounds[0].id)
    }
    setLoading(false)
    return res.ok
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
            const ok = await fetchPresenca(password)
            if (ok) { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
          }} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha admin"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <h1 className="text-lg font-bold text-gray-900">Histórico de presença</h1>
            <p className="text-xs text-gray-400">Todas as rodadas · todos os jogadores</p>
          </div>
          <Link href="/admin" className="text-xs text-blue-600 hover:underline">← Admin</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {loading && <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>}

        {rounds.map(round => (
          <div key={round.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header da rodada */}
            <button
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
              onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(round.scheduled_date)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {ROUND_STATUS_LABEL[round.status] ?? round.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-green-600 font-medium">{round.stats.confirmed} confirmados</span>
                  {round.stats.suplente > 0 && (
                    <span className="text-xs text-yellow-600 font-medium">{round.stats.suplente} suplentes</span>
                  )}
                  <span className="text-xs text-red-500">{round.stats.absent} ausentes</span>
                  <span className="text-xs text-gray-400">{round.stats.pending} sem resposta</span>
                </div>
              </div>
              <span className="text-gray-400 text-xs ml-4">{expandedRound === round.id ? '▲' : '▼'}</span>
            </button>

            {expandedRound === round.id && (
              <div className="border-t border-gray-100 p-4">
                {/* Filtro */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(['all', 'confirmed', 'suplente', 'absent', 'pending'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        filterStatus === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>

                {/* Lista de jogadores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {round.players
                    .filter(p => filterStatus === 'all' || p.status === filterStatus)
                    .map(p => (
                      <div key={p.id} className="flex items-center gap-2 py-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        <span className="text-sm text-gray-800 truncate">{p.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
