'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/AdminLayout'

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
  const [closing, setClosing] = useState(false)

  const fetchStatus = useCallback(async (pwd: string) => {
    const res = await fetch('/api/admin/status', { headers: { 'x-admin-password': pwd } })
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
    if (!ok) { setAuthError('Senha incorreta') }
    else { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
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
    if (res.ok) { await fetchStatus(password); toast.success('Rodada encerrada!') }
    else { toast.error(data.error || 'Erro ao encerrar rodada') }
    setClosing(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Verificando sessão...</p>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="text-4xl mb-1">🔐</div>
            <CardTitle>Área Admin</CardTitle>
            <p className="text-sm text-muted-foreground">Baba Lets</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha admin"
                className="w-full h-10 px-3 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              {authError && <p className="text-destructive text-sm">{authError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <p className="text-center mt-4">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!status) return null

  const progress = status.total > 0 ? Math.round((status.voted / status.total) * 100) : 0
  const dateStr = formatDate(status.active_round?.scheduled_date)

  const roundStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    closed: { label: 'Encerrada', variant: 'secondary' },
    drawn:  { label: 'Sorteada',  variant: 'default' },
    draft:  { label: 'Em preparação', variant: 'outline' },
    open:   { label: 'Aberta',    variant: 'outline' },
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        {/* Rodada ativa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rodada ativa</CardTitle>
          </CardHeader>
          <CardContent>
            {status.active_round ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{dateStr}</p>
                    <div className="mt-1">
                      {(() => {
                        const st = roundStatusMap[status.active_round.status]
                        return st ? <Badge variant={st.variant}>{st.label}</Badge> : null
                      })()}
                    </div>
                  </div>
                  <Link href="/admin/rodada">
                    <Button variant="outline" size="sm">Gerenciar →</Button>
                  </Link>
                </div>
                {status.active_round.status === 'closed' && (
                  <Link href="/admin/rodada">
                    <Button className="w-full mt-4" size="lg">+ Criar nova rodada</Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">Nenhuma rodada ativa.</p>
                <Link href="/admin/rodada">
                  <Button variant="outline" size="sm">Criar rodada →</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progresso da votação */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Progresso da votação</p>
              <span className="text-2xl font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
                <div className="text-2xl font-bold text-primary">{status.voted}</div>
                <div className="text-xs text-primary/80">Já avaliaram</div>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="text-2xl font-bold text-foreground">{status.total - status.voted}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quem não votou */}
        {status.not_voted.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold mb-3">Ainda não avaliaram ({status.not_voted.length})</p>
              <div className="flex flex-wrap gap-2">
                {status.not_voted.map(name => (
                  <Badge key={name} variant="secondary">{name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Encerrar rodada */}
        {status.active_round?.status === 'drawn' && (
          <Card>
            <CardContent className="pt-5">
              <p className="font-semibold text-sm mb-1">Encerrar rodada</p>
              <p className="text-xs text-muted-foreground mb-4">
                Confirme que a partida aconteceu. Após encerrada, substituições não são mais possíveis.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleCloseRound}
                disabled={closing}
              >
                {closing ? 'Encerrando...' : 'Encerrar rodada'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">Resultado e sorteio em <strong>Rodada</strong>.</p>
          <Link href="/admin/rodada" className="text-sm text-primary hover:underline">Ir para Rodada →</Link>
        </div>
      </div>
    </AdminLayout>
  )
}
