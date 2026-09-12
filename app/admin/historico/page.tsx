'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { formatDateLong } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AttendancePlayer { name: string; status: string }
interface RoundAttendance {
  confirmed: number; absent: number; suplente: number; players: AttendancePlayer[]
}
interface TeamEntry { team: number; player_id: number; pote: number; name: string }
interface PotEntry { player_id: number; pote: number; name: string }
interface RoundHistory {
  id: number; scheduled_date: string; status: string
  attendance: RoundAttendance; teams: TeamEntry[]; pots: PotEntry[]
}

const POTE_BADGE_CLS: Record<number, string> = {
  1: 'bg-blue-900 text-white border-0', 2: 'bg-blue-700 text-white border-0',
  3: 'bg-blue-500 text-white border-0', 4: 'bg-slate-500 text-white border-0',
  5: 'bg-slate-400 text-white border-0', 6: 'bg-slate-200 text-slate-700 border-0',
}

const TEAM_HEADER = ['bg-blue-700 text-white', 'bg-sky-500 text-white', 'bg-orange-500 text-white']

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft:  { label: 'Em preparação', variant: 'secondary' },
  open:   { label: 'Aberta',        variant: 'outline' },
  drawn:  { label: 'Sorteada',      variant: 'default' },
  closed: { label: 'Encerrada',     variant: 'secondary' },
}

const ATTENDANCE_CLS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  suplente:  'bg-yellow-100 text-yellow-700',
  absent:    'bg-red-100 text-red-600',
}

export default function AdminHistoricoPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rounds, setRounds] = useState<RoundHistory[]>([])
  const [defaultOpen, setDefaultOpen] = useState<string>('')

  async function fetchHistorico(pwd: string): Promise<boolean> {
    setLoading(true)
    const res = await fetch('/api/admin/historico', { headers: { 'x-admin-password': pwd } })
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
    fetchHistorico(saved).then(ok => {
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
              const ok = await fetchHistorico(password)
              if (ok) { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
              else setAuthError('Senha incorreta')
            }} className="space-y-3">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Senha admin"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              {authError && <p className="text-destructive text-sm">{authError}</p>}
              <button type="submit" className="w-full h-10 bg-primary text-primary-foreground font-semibold rounded-lg text-sm">Entrar</button>
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
          <h1 className="text-xl font-bold">Histórico de rodadas</h1>
          <p className="text-xs text-muted-foreground">{rounds.length} rodada{rounds.length !== 1 ? 's' : ''} registrada{rounds.length !== 1 ? 's' : ''}</p>
        </div>
        {loading && <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>}
        {!loading && rounds.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma rodada registrada ainda.</p>
          </Card>
        )}

        <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-2">
          {rounds.map(round => {
            const st = STATUS_MAP[round.status] ?? { label: round.status, variant: 'secondary' as const }
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
            const hasAtt   = round.attendance.players.length > 0

            return (
              <AccordionItem key={round.id} value={String(round.id)} className="bg-card rounded-xl border border-border">
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:text-muted-foreground">
                  <div className="text-left">
                    <p className="font-semibold">{formatDateLong(round.scheduled_date)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant={st.variant} className="text-xs h-5">{st.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {round.attendance.confirmed} jogaram
                        {round.attendance.suplente > 0 ? ` · ${round.attendance.suplente} suplentes` : ''}
                        {round.attendance.absent > 0 ? ` · ${round.attendance.absent} ausentes` : ''}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <Tabs defaultValue={hasTeams ? 'times' : hasPots ? 'potes' : 'presenca'}>
                    {(hasTeams || hasPots || hasAtt) && (
                      <TabsList className="mb-4 h-9">
                        {hasTeams && <TabsTrigger value="times" className="text-xs">Times</TabsTrigger>}
                        {hasPots && <TabsTrigger value="potes" className="text-xs">Potes</TabsTrigger>}
                        {hasAtt && <TabsTrigger value="presenca" className="text-xs">Presença</TabsTrigger>}
                      </TabsList>
                    )}

                    {hasTeams && (
                      <TabsContent value="times">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[1,2,3].map(team => (
                            <div key={team} className="rounded-xl border border-border overflow-hidden">
                              <div className={`px-3 py-2 text-xs font-bold text-center ${TEAM_HEADER[team-1]}`}>Time {team}</div>
                              <div className="p-2 space-y-1">
                                {(byTeam[team] || []).map(e => (
                                  <div key={e.player_id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-md px-2 py-1.5">
                                    <span className="text-xs truncate">{e.name}</span>
                                    <Badge className={`text-xs flex-shrink-0 ${POTE_BADGE_CLS[e.pote]}`}>P{e.pote}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    )}

                    {hasPots && (
                      <TabsContent value="potes">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[1,2,3,4,5,6].map(pote => {
                            const jogadores = byPote[pote] || []
                            if (!jogadores.length) return null
                            return (
                              <div key={pote} className="rounded-xl border border-border p-3">
                                <Badge className={`text-xs mb-2 inline-block ${POTE_BADGE_CLS[pote]}`}>Pote {pote}</Badge>
                                <div className="space-y-0.5">
                                  {jogadores.map(j => (
                                    <p key={j.player_id} className="text-xs text-foreground truncate">{j.name}</p>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>
                    )}

                    {hasAtt && (
                      <TabsContent value="presenca">
                        <div className="space-y-3">
                          {(['confirmed', 'suplente', 'absent'] as const).map(status => {
                            const players = round.attendance.players.filter(p => p.status === status)
                            if (!players.length) return null
                            const labels: Record<string, string> = { confirmed: 'Jogaram', suplente: 'Suplentes', absent: 'Ausentes' }
                            return (
                              <div key={status}>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{labels[status]} ({players.length})</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {players.map(p => (
                                    <span key={p.name} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ATTENDANCE_CLS[status]}`}>
                                      {p.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>
                    )}

                    {!hasTeams && !hasPots && !hasAtt && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado registrado.</p>
                    )}
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </AdminLayout>
  )
}
