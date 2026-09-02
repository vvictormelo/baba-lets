'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Participant {
  id: number
  name: string
  has_voted: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    fetch('/api/participants')
      .then(r => r.json())
      .then(data => {
        setParticipants(data)
        setLoadingList(false)
      })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !pin) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: Number(selectedId), pin }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao entrar')
      setLoading(false)
      return
    }

    sessionStorage.setItem('baba_voter_id', String(data.id))
    sessionStorage.setItem('baba_voter_name', data.name)

    if (data.has_voted) {
      router.push('/resumo?readonly=1')
    } else {
      router.push('/votar')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-gray-900">Baba Lets</h1>
          <p className="text-gray-500 mt-1">Monte seus potes e vote!</p>
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
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.has_voted ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu PIN
              </label>
              <input
                type="number"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="0000"
                maxLength={4}
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-gray-900 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedId || !pin}
              className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Admin? <a href="/admin" className="text-green-600 hover:underline">Acesse aqui</a>
        </p>
      </div>
    </div>
  )
}
