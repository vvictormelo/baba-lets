'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Player {
  id: number
  name: string
  active: boolean
}

export default function AdminJogadoresPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')

  async function fetchPlayers(pwd: string) {
    const res = await fetch('/api/admin/players', {
      headers: { 'x-admin-password': pwd },
    })
    if (res.ok) setPlayers(await res.json())
    return res.ok
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const ok = await fetchPlayers(password)
    if (!ok) setAuthError('Senha incorreta')
    else setAuthenticated(true)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      setNewName('')
      await fetchPlayers(password)
      showMessage('Jogador adicionado!')
    }
    setAdding(false)
  }

  async function handleToggleActive(player: Player) {
    await fetch(`/api/admin/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ active: !player.active }),
    })
    await fetchPlayers(password)
  }

  async function handleRename(id: number) {
    if (!editName.trim()) return
    await fetch(`/api/admin/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setEditId(null)
    setEditName('')
    await fetchPlayers(password)
    showMessage('Nome atualizado!')
  }

  function showMessage(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900">Admin — Jogadores</h1>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha admin"
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            {authError && <p className="text-red-600 text-sm">{authError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center mt-4">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
          </p>
        </div>
      </div>
    )
  }

  const active = players.filter(p => p.active)
  const inactive = players.filter(p => !p.active)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Jogadores</h1>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm text-center">
            {message}
          </div>
        )}

        {/* Adicionar jogador */}
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome do novo jogador"
            className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-4 h-10 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {adding ? '...' : 'Adicionar'}
          </button>
        </form>

        {/* Ativos */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Ativos ({active.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {active.map(player => (
              <div key={player.id} className="px-4 py-3 flex items-center gap-3">
                {editId === player.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(player.id)}
                      className="text-xs text-green-600 hover:underline font-medium"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-xs text-gray-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-900">{player.name}</span>
                    <button
                      onClick={() => { setEditId(player.id); setEditName(player.name) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(player)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Inativar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inativos */}
        {inactive.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-500 text-sm">Inativos ({inactive.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {inactive.map(player => (
                <div key={player.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="flex-1 text-sm text-gray-600 line-through">{player.name}</span>
                  <button
                    onClick={() => handleToggleActive(player)}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Reativar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
