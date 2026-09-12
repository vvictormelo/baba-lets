'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Player {
  id: number
  name: string
  active: boolean
  is_novice: boolean
  is_goalkeeper: boolean
}

export default function AdminJogadoresPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authError, setAuthError] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  async function fetchPlayers(pwd: string) {
    const res = await fetch('/api/admin/players', { headers: { 'x-admin-password': pwd } })
    if (res.ok) setPlayers(await res.json())
    return res.ok
  }

  async function patch(player: Player, data: Partial<Player>) {
    await fetch(`/api/admin/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(data),
    })
    await fetchPlayers(password)
  }

  async function handleResetPin(player: Player) {
    if (!confirm(`Resetar o PIN de ${player.name}? Ele precisará criar um novo PIN no próximo login.`)) return
    const res = await fetch(`/api/admin/players/${player.id}/reset-pin`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })
    if (res.ok) toast.success(`PIN de ${player.name} resetado.`)
    else toast.error('Erro ao resetar PIN')
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchPlayers(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const ok = await fetchPlayers(password)
    if (!ok) { setAuthError('Senha incorreta') }
    else { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
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
    if (res.ok) { setNewName(''); await fetchPlayers(password); toast.success('Jogador adicionado!') }
    setAdding(false)
  }

  async function handleRename(id: number) {
    if (!editName.trim()) return
    await fetch(`/api/admin/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setEditId(null); setEditName('')
    await fetchPlayers(password)
    toast.success('Nome atualizado!')
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground text-sm">Verificando...</p></div>
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="text-4xl mb-1">🔐</div>
            <CardTitle>Admin — Jogadores</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Senha admin"
                className="w-full h-10 px-3 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
              {authError && <p className="text-destructive text-sm">{authError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
            </form>
            <p className="text-center mt-4">
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const active = players.filter(p => p.active)
  const inactive = players.filter(p => !p.active)

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Jogadores</h1>
        {/* Adicionar jogador */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome do novo jogador"
            className="flex-1 h-10 px-3 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={adding || !newName.trim()}>
            {adding ? '...' : 'Adicionar'}
          </Button>
        </form>

        {/* Ativos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ativos ({active.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {active.map(player => (
                <div key={player.id} className="px-4 py-3">
                  {editId === player.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 h-8 px-2 border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleRename(player.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{player.name}</span>
                          {player.is_goalkeeper && <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">Goleiro</Badge>}
                          {player.is_novice && <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">Novato</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <button onClick={() => patch(player, { is_goalkeeper: !player.is_goalkeeper })}
                            className="text-xs text-muted-foreground hover:text-primary">
                            {player.is_goalkeeper ? 'Remover goleiro' : 'Marcar goleiro'}
                          </button>
                          <span className="text-xs text-muted-foreground">·</span>
                          <button onClick={() => patch(player, { is_novice: !player.is_novice })}
                            className="text-xs text-muted-foreground hover:text-orange-500">
                            {player.is_novice ? 'Remover novato' : 'Marcar novato'}
                          </button>
                          <span className="text-xs text-muted-foreground">·</span>
                          <button onClick={() => { setEditId(player.id); setEditName(player.name) }}
                            className="text-xs text-muted-foreground hover:text-foreground">
                            Editar nome
                          </button>
                          <span className="text-xs text-muted-foreground">·</span>
                          <button onClick={() => handleResetPin(player)}
                            className="text-xs text-muted-foreground hover:text-yellow-600">
                            Resetar PIN
                          </button>
                          <span className="text-xs text-muted-foreground">·</span>
                          <button onClick={() => patch(player, { active: false })}
                            className="text-xs text-destructive hover:opacity-80">
                            Inativar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {inactive.length > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Inativos ({inactive.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {inactive.map(player => (
                    <div key={player.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                      <span className="flex-1 text-sm line-through">{player.name}</span>
                      <button onClick={() => patch(player, { active: true })}
                        className="text-xs text-primary hover:underline">
                        Reativar
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
