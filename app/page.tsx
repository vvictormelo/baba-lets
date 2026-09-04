'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Player {
  id: number
  name: string
}

export default function LoginPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(data => {
        setPlayers(data)
        setLoadingList(false)
      })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: Number(selectedId) }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao entrar')
      setLoading(false)
      return
    }

    sessionStorage.setItem('baba_voter_id', String(data.id))
    sessionStorage.setItem('baba_voter_name', data.name)
    router.push('/painel')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-gray-900">Baba Lets</h1>
          <p className="text-gray-500 mt-1">Avalie os jogadores e monte os times!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quem é você?
              </label>
              {loadingList ? (
                <div className="h-11 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione seu nome...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedId}
              className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <a href="/ranking" className="text-xs text-green-600 hover:underline">Ver ranking</a>
          <span className="text-xs text-gray-300">|</span>
          <a href="/resultado" className="text-xs text-green-600 hover:underline">Ver resultado</a>
          <span className="text-xs text-gray-300">|</span>
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">Admin</a>
        </div>
      </div>
    </div>
  )
}
