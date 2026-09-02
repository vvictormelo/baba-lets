'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminStatus {
  total: number
  voted: number
  not_voted: string[]
  voted_list: string[]
  results_revealed: boolean
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')

    const res = await fetch('/api/admin/status', {
      headers: { 'x-admin-password': password },
    })

    if (!res.ok) {
      setAuthError('Senha incorreta')
      setLoading(false)
      return
    }

    const data = await res.json()
    setStatus(data)
    setAuthenticated(true)
    setLoading(false)
  }

  async function refreshStatus() {
    const res = await fetch('/api/admin/status', {
      headers: { 'x-admin-password': password },
    })
    if (res.ok) setStatus(await res.json())
  }

  async function toggleReveal() {
    if (!status) return
    setToggling(true)
    const res = await fetch('/api/admin/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ reveal: !status.results_revealed }),
    })
    if (res.ok) {
      await refreshStatus()
      setMessage(!status.results_revealed ? 'Resultados revelados!' : 'Resultados ocultados.')
      setTimeout(() => setMessage(''), 3000)
    }
    setToggling(false)
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
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {authError}
              </div>
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

  const progress = Math.round((status.voted / status.total) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin — Baba Lets</h1>
            <p className="text-sm text-gray-500">{status.voted}/{status.total} votaram</p>
          </div>
          <Link href="/resultados" className="text-sm text-green-600 hover:underline">
            Ver resultados →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm font-medium text-center">
            {message}
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Progresso da votação</h2>
            <span className="text-2xl font-bold text-green-600">{progress}%</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{status.voted}</div>
              <div className="text-green-600">Votaram</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{status.total - status.voted}</div>
              <div className="text-gray-500">Pendentes</div>
            </div>
          </div>
        </div>

        {/* Pending */}
        {status.not_voted.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Ainda não votaram ({status.not_voted.length})</h2>
            <div className="flex flex-wrap gap-2">
              {status.not_voted.map(name => (
                <span key={name} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Voted */}
        {status.voted_list.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Já votaram ({status.voted_list.length})</h2>
            <div className="flex flex-wrap gap-2">
              {status.voted_list.map(name => (
                <span key={name} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  ✓ {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reveal button */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Resultados</h2>
          <p className="text-sm text-gray-500 mb-4">
            {status.results_revealed
              ? 'Os resultados estão visíveis para todos.'
              : 'Os resultados estão ocultos. Revele quando todos tiverem votado.'}
          </p>
          <button
            onClick={toggleReveal}
            disabled={toggling}
            className={`w-full h-12 font-semibold rounded-xl transition-colors ${
              status.results_revealed
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {toggling
              ? 'Atualizando...'
              : status.results_revealed
              ? 'Ocultar Resultados'
              : 'Revelar Resultados'}
          </button>
        </div>
      </div>
    </div>
  )
}
