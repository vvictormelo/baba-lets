'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/format'
import { AdminLayout } from '@/components/AdminLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type AttendanceStatus = 'confirmed' | 'absent' | 'suplente' | 'pending'

interface PlayerAttendance { id: number; name: string; status: AttendanceStatus }
interface RoundData {
  id: number
  scheduled_date: string
  status: string
  players: PlayerAttendance[]
  stats: { confirmed: number; suplente: number; absent: number; pending: number }
}

const STATUS_CLS: Record<AttendanceStatus, string> = {
  confirmed: 'bg-green-100 text-green-700',
  suplente:  'bg-yellow-100 text-yellow-700',
  absent:    'bg-red-100 text-red-600',
  pending:   'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  confirmed: 'Confirmado',
  suplente:  'Suplente',
  absent:    'Ausente',
  pending:   'Sem resposta',
}

const ROUND_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft:  { label: 'Em preparação', variant: 'secondary' },
  open:   { label: 'Aberta',        variant: 'outline' },
  drawn:  { label: 'Sorteada',      variant: 'default' },
  closed: { label: 'Encerrada',     variant: 'secondary' },
}

const FILTERS: { value: AttendanceStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'suplente',  label: 'Suplentes' },
  { value: 'absent',    label: 'Ausentes' },
  { value: 'pending',   label: 'Sem resposta' },
]

export default function AdminPresencaPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authError, setAuthError] = useState('')
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [loading, setLoading] = useState(false)
  const [defaultOpen, setDefaultOpen] = useState('')
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all')

  async function fetchPresenca(pwd: string): Promise<boolean> {
    setLoading(true)
    const res = await fetch('/api/admin/presenca', { headers: { 'x-admin-password': pwd } })
    if (res.ok) {
      const data = await res.json()
      setRounds(data.rounds || [])
      if (data.rounds?.length > 0) setDefaultOpen(String(data.rounds[0].id))
    }
    setLoading(false)
    return res.ok
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchPresenca(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground text-sm">Carregando...</p></div>
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-3 text-center">
            <div className="text-4xl mb-1">🔐</div>
            <CardTitle>Acesso admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={async e => {
              e.preventDefault()
              const ok = await fetchPresenca(password)
              if (ok) { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
              else setAuthError('Senha incorreta')
            }} className="space-y-3">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Senha admin"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {authError && <p className="text-destructive text-sm">{authError}</p>}
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Presença</h1>
          <p className="text-xs text-muted-foreground">Todas as rodadas · todos os jogadores</p>
        </div>

        {/* Filtro global */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filterStatus === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>}

        <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-2">
          {rounds.map(round => {
            const st = ROUND_STATUS_MAP[round.status] ?? { label: round.status, variant: 'secondary' as const }
            const filtered = round.players.filter(p => filterStatus === 'all' || p.status === filterStatus)

            return (
              <AccordionItem key={round.id} value={String(round.id)} className="bg-card rounded-xl border border-border">
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:text-muted-foreground">
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{formatDate(round.scheduled_date)}</span>
                      <Badge variant={st.variant} className="text-xs h-5">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-green-600 font-medium">{round.stats.confirmed} confirmados</span>
                      {round.stats.suplente > 0 && (
                        <span className="text-xs text-yellow-600 font-medium">{round.stats.suplente} suplentes</span>
                      )}
                      <span className="text-xs text-destructive">{round.stats.absent} ausentes</span>
                      <span className="text-xs text-muted-foreground">{round.stats.pending} sem resposta</span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum jogador nesta categoria.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filtered.map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CLS[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                          <span className="text-sm truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </AdminLayout>
  )
}
