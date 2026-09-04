'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/format'

interface AdminStatus {
  total: number
  voted: number
  not_voted: string[]
  voted_list: string[]
  results_revealed: boolean
  active_round: { id: number; scheduled_date: string; status: string } | null
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authError, setAuthError] = useState('')
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState('')

  const fetchStatus = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/status', {
      headers: { 'x-admin-password': pwd },
    })
    if (res.ok) setStatus(await res.json())
    return res.ok
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchStatus(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [fetchStatus])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const ok = await fetchStatus(password)
    if (!ok) {
      setAuthError('Senha incorreta')
    } else {
      sessionStorage.setItem('baba_admin_pwd', password)
      setAuthenticated(true)
    }
    setLoading(false)
  }

  async function handleCloseRound() {
    if (!status?.active_round) return
    setClosing(true)
    const res = await fetch(`/api/admin/rounds/${status.active_round.id}/close`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (res.ok) {
      await fetchStatus(password)
      setMessage('Rodada encerrada!')
    } else {
      setMessage(data.error || 'Erro ao encerrar rodada')
    }
    setTimeout(() => setMessage(''), 4000)
    setClosing(false)
  }

  async function toggleReveal() {
    if (!status) return
    setToggling(true)
    await fetch('/api/admin/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ reveal: !status.results_revealed }),
    })
    await fetchStatus(password)
    setMessage(!status.results_revealed ? 'Resultado revelado!' : 'Resultado ocultado.')
    setTimeout(() => setMessage(''), 3000)
    setToggling(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Verificando sessão...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900">Área Admin</h1>
            <p className="text-gray-500 text-sm">Baba Lets</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha admin</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{authError}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center mt-4">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Voltar</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!status) return null

  const progress = status.total > 0 ? Math.round((status.voted / status.total) * 100) : 0
  const dateStr = formatDate(status.active_round?.scheduled_date)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Admin — Baba Lets</h1>
          <div className="flex gap-3">
            <Link href="/admin/jogadores" className="text-sm text-green-600 hover:underline">Jogadores</Link>
            <Link href="/admin/rodada" className="text-sm text-green-600 hover:underline">Rodada</Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm text-center font-medium">
            {message}
          </div>
        )}

        {/* Rodada ativa */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Rodada ativa</h2>
          {status.active_round ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 font-medium">{dateStr}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  status.active_round.status === 'drawn' ? 'bg-green-100 text-green-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {status.active_round.status === 'drawn' ? 'Sorteado' :
                   status.active_round.status === 'draft' ? 'Em preparação' : status.active_round.status}
                </span>
              </div>
              <Link href="/admin/rodada" className="text-sm text-green-600 hover:underline font-medium">
                Gerenciar →
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Nenhuma rodada ativa.</p>
              <Link href="/admin/rodada" className="text-sm text-green-600 hover:underline">Criar rodada →</Link>
            </div>
          )}
        </div>

        {/* Progresso de votação */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Progresso da votação</h2>
            <span className="text-2xl font-bold text-green-600">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{status.voted}</div>
              <div className="text-green-600 text-xs">Já avaliaram</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{status.total - status.voted}</div>
              <div className="text-gray-500 text-xs">Pendentes</div>
            </div>
          </div>
        </div>

        {status.not_voted.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Ainda não avaliaram ({status.not_voted.length})</h2>
            <div className="flex flex-wrap gap-2">
              {status.not_voted.map(name => (
                <span key={name} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Encerrar rodada */}
        {status.active_round?.status === 'drawn' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Encerrar rodada</h2>
            <p className="text-sm text-gray-500 mb-4">
              Confirme que a partida aconteceu. Após encerrada, substituições não serão mais possíveis.
            </p>
            <button
              onClick={handleCloseRound}
              disabled={closing}
              className="w-full h-11 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {closing ? 'Encerrando...' : 'Encerrar rodada'}
            </button>
          </div>
        )}

        {/* Revelar resultado */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Resultado público</h2>
          <p className="text-sm text-gray-500 mb-4">
            {status.results_revealed
              ? 'O resultado está visível para todos.'
              : 'O resultado está oculto. Revele após o sorteio.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={toggleReveal}
              disabled={toggling}
              className={`flex-1 h-11 font-semibold rounded-xl transition-colors text-sm ${
                status.results_revealed
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {toggling ? '...' : status.results_revealed ? 'Ocultar resultado' : 'Revelar resultado'}
            </button>
            <Link
              href="/resultado"
              className="px-4 h-11 flex items-center border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ver →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
