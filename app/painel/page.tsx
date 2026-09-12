'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate, formatDateLong } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface HistoryEntry {
  round_id: number
  scheduled_date: string | null
  status: string | null
  attendance: 'confirmed' | 'absent' | 'suplente' | null
  is_novice: boolean
  pote: number | null
  team: number | null
  active: boolean
}

interface PoteEntry { pote: number; player_id: number; name: string }

interface ActiveRound {
  id: number
  scheduled_date: string
  status: string
  confirmados: number
  potes: PoteEntry[]
}

interface HistoricoData {
  active_round_id: number | null
  active_round: ActiveRound | null
  attendance_status: 'confirmed' | 'absent' | null
  history: HistoryEntry[]
}

interface PlayerItem { id: number; name: string }

interface ListaPresenca {
  round: { id: number; scheduled_date: string; status: string } | null
  confirmados: PlayerItem[]
  suplentes: PlayerItem[]
  ausentes: PlayerItem[]
  pendentes: PlayerItem[]
}

interface AwardEntry { player_id: number; name: string; votes: number }
interface AwardsData {
  round_id: number
  mvp: AwardEntry[]
  pereba: AwardEntry[]
  my_vote: { mvp_id: number; pereba_id: number } | null
}

const POTE_BADGE_CLS: Record<number, string> = {
  1: 'bg-blue-900 text-white border-0',
  2: 'bg-blue-700 text-white border-0',
  3: 'bg-blue-500 text-white border-0',
  4: 'bg-slate-500 text-white border-0',
  5: 'bg-slate-400 text-white border-0',
  6: 'bg-slate-200 text-slate-700 border-0',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Em preparação', open: 'Aberta', closed: 'Encerrada', drawn: 'Sorteada',
}

const ATTENDANCE_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Jogou',    cls: 'bg-primary/10 text-primary border-primary/20' },
  absent:    { label: 'Ausente',  cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  suplente:  { label: 'Suplente', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

export default function PainelPage() {
  const router = useRouter()
  const [voterId, setVoterId] = useState<number | null>(null)
  const [voterName, setVoterName] = useState('')
  const [data, setData] = useState<HistoricoData | null>(null)
  const [lista, setLista] = useState<ListaPresenca | null>(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [awards, setAwards] = useState<AwardsData | null>(null)
  const [selectedMvp, setSelectedMvp] = useState('')
  const [selectedPereba, setSelectedPereba] = useState('')
  const [submittingAward, setSubmittingAward] = useState(false)

  const loadData = useCallback(async (id: number) => {
    const [hist, votes, presenca] = await Promise.all([
      fetch(`/api/meu-historico?player_id=${id}`).then(r => r.json()),
      fetch(`/api/meus-votos?voter_id=${id}`).then(r => r.json()),
      fetch('/api/lista-presenca').then(r => r.json()),
    ])
    setData(hist)
    setVoteCount(Array.isArray(votes) ? votes.length : 0)
    setLista(presenca)
    const roundId = hist?.active_round?.id
    if (roundId) {
      const awardsData = await fetch(`/api/awards?round_id=${roundId}&voter_id=${id}`).then(r => r.json())
      setAwards(awardsData)
      if (awardsData?.my_vote) {
        setSelectedMvp(String(awardsData.my_vote.mvp_id))
        setSelectedPereba(String(awardsData.my_vote.pereba_id))
      }
    }
  }, [])

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    const numId = Number(id)
    setVoterId(numId); setVoterName(name)
    loadData(numId).then(() => setLoading(false))
  }, [router, loadData])

  async function handleAwardSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!voterId || !activeRound || !selectedMvp || !selectedPereba) return
    setSubmittingAward(true)
    const res = await fetch('/api/awards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter_id: voterId, round_id: activeRound.id, mvp_id: Number(selectedMvp), pereba_id: Number(selectedPereba) }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Erro ao salvar') }
    else {
      toast.success(awards?.my_vote ? 'Voto atualizado!' : 'Voto salvo!')
      const awardsData = await fetch(`/api/awards?round_id=${activeRound.id}&voter_id=${voterId}`).then(r => r.json())
      setAwards(awardsData)
    }
    setSubmittingAward(false)
  }

  async function handleCheckin(confirmar: boolean) {
    if (!voterId) return
    setCheckingIn(true)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: voterId, confirmar }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Erro ao processar') }
    else {
      if (result.suplente) toast.info('Você está na lista de suplentes. Aguarde uma vaga!')
      else toast.success(confirmar ? 'Presença confirmada!' : 'Presença cancelada.')
      await loadData(voterId)
    }
    setCheckingIn(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const activeRound = data?.active_round ?? null
  const activeEntry = data?.history.find(h => h.active) ?? null
  const pastEntries = data?.history.filter(h => !h.active) ?? []
  const isConfirmed = !!activeEntry && activeEntry.attendance === 'confirmed'
  const isSuplente = data?.attendance_status === 'confirmed' && !isConfirmed
  const isAbsent = data?.attendance_status === 'absent'
  const roundClosed = activeRound?.status === 'drawn' || activeRound?.status === 'closed'
  const vagas = activeRound ? 18 - activeRound.confirmados : 0

  const roundCardLabel = activeRound?.status === 'closed'
    ? 'Última rodada' : activeRound?.status === 'drawn' ? 'Rodada atual' : 'Próxima rodada'

  const cardBorder = isConfirmed ? 'border-primary' : isSuplente ? 'border-yellow-400' : isAbsent ? 'border-destructive/50' : 'border-border'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Let's Baba" width={120} height={40} className="h-9 w-auto" priority />
            <p className="text-sm text-muted-foreground border-l border-border pl-3">{voterName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { sessionStorage.clear(); router.replace('/') }}>
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Card da rodada */}
        {activeRound ? (
          <Card className={`border-2 ${cardBorder}`}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{roundCardLabel}</p>
                  <p className="font-bold text-lg leading-tight">{formatDateLong(activeRound.scheduled_date)}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant={activeRound.status === 'drawn' ? 'default' : 'secondary'} className="text-xs">
                      {STATUS_LABEL[activeRound.status] ?? activeRound.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activeRound.confirmados}/18
                      {!isConfirmed && !isSuplente && vagas > 0 && !roundClosed && (
                        <span className="text-primary font-medium"> · {vagas} vaga{vagas !== 1 ? 's' : ''}</span>
                      )}
                      {!isConfirmed && !isSuplente && vagas === 0 && !roundClosed && (
                        <span className="text-destructive font-medium"> · lotado</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-center">
                  {isConfirmed ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl">✓</div>
                      <p className="text-xs text-primary font-medium mt-1">Confirmado</p>
                    </>
                  ) : isSuplente ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xl">⏳</div>
                      <p className="text-xs text-yellow-700 font-medium mt-1">Suplente</p>
                    </>
                  ) : isAbsent ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-destructive/80 flex items-center justify-center text-white text-xl">✗</div>
                      <p className="text-xs text-destructive font-medium mt-1">Ausente</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-2xl">?</div>
                      <p className="text-xs text-muted-foreground mt-1">Pendente</p>
                    </>
                  )}
                </div>
              </div>

              {/* Pote e time */}
              {isConfirmed && (activeEntry?.pote || activeEntry?.team) && (
                <div className="flex items-center gap-2 mb-4">
                  {activeEntry.pote && (
                    <Badge className={`${POTE_BADGE_CLS[activeEntry.pote]}`}>Pote {activeEntry.pote}</Badge>
                  )}
                  {activeEntry.team && (
                    <Badge variant="outline">Time {activeEntry.team}</Badge>
                  )}
                </div>
              )}

              {isSuplente && (
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mb-4">
                  Você confirmou presença, mas a rodada está cheia. Se alguém cancelar, o admin pode te incluir.
                </p>
              )}

              {/* Botões de ação */}
              {!roundClosed && (
                isConfirmed || isSuplente ? (
                  <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                    onClick={() => handleCheckin(false)} disabled={checkingIn}>
                    {checkingIn ? '...' : 'Cancelar presença'}
                  </Button>
                ) : isAbsent ? (
                  <Button className="w-full" size="lg" onClick={() => handleCheckin(true)} disabled={checkingIn}>
                    {checkingIn ? 'Confirmando...' : 'Confirmar presença'}
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button className="flex-1" size="lg" onClick={() => handleCheckin(true)} disabled={checkingIn}>
                      {checkingIn ? '...' : 'Confirmar presença'}
                    </Button>
                    <Button variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/5"
                      size="lg" onClick={() => handleCheckin(false)} disabled={checkingIn}>
                      {checkingIn ? '...' : 'Não vou'}
                    </Button>
                  </div>
                )
              )}

              {roundClosed && isConfirmed && (
                <Link href="/resultado">
                  <Button className="w-full" size="lg">Ver resultado →</Button>
                </Link>
              )}

              {/* Potes da rodada */}
              {activeRound.potes.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Potes da rodada</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1,2,3,4,5,6].map(pote => {
                      const jogadores = activeRound.potes.filter(p => p.pote === pote)
                      if (!jogadores.length) return null
                      return (
                        <div key={pote} className="rounded-lg bg-muted/40 p-2.5">
                          <Badge className={`text-xs mb-1.5 ${POTE_BADGE_CLS[pote]}`}>Pote {pote}</Badge>
                          <div className="space-y-0.5">
                            {jogadores.map(j => (
                              <p key={j.player_id}
                                className={`text-xs truncate ${j.player_id === voterId ? 'font-bold text-primary' : 'text-foreground'}`}>
                                {j.player_id === voterId ? '▶ ' : ''}{j.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-muted-foreground text-sm">Nenhuma rodada agendada no momento.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">O admin vai cadastrar quando tiver data definida.</p>
            </CardContent>
          </Card>
        )}

        {/* MVP e Pereba */}
        {activeRound && roundClosed && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">MVP e Pereba da rodada</CardTitle>
              <p className="text-xs text-muted-foreground">Escolha o melhor e o pior da pelada</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeRound.potes.length > 0 && (
                <form onSubmit={handleAwardSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-yellow-600 mb-1">🏆 MVP</label>
                      <select value={selectedMvp} onChange={e => setSelectedMvp(e.target.value)}
                        className="w-full h-10 px-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" required>
                        <option value="">Escolher...</option>
                        {activeRound.potes.filter(p => p.player_id !== voterId).map(p => (
                          <option key={p.player_id} value={p.player_id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-red-500 mb-1">💩 Pereba</label>
                      <select value={selectedPereba} onChange={e => setSelectedPereba(e.target.value)}
                        className="w-full h-10 px-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" required>
                        <option value="">Escolher...</option>
                        {activeRound.potes.filter(p => p.player_id !== voterId && String(p.player_id) !== selectedMvp).map(p => (
                          <option key={p.player_id} value={p.player_id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" className="w-full"
                    disabled={submittingAward || !selectedMvp || !selectedPereba}>
                    {submittingAward ? 'Salvando...' : awards?.my_vote ? 'Atualizar voto' : 'Salvar voto'}
                  </Button>
                </form>
              )}

              {awards && (awards.mvp.length > 0 || awards.pereba.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-600 mb-2">🏆 MVP</p>
                    <div className="space-y-1">
                      {awards.mvp.slice(0, 5).map((a, i) => (
                        <div key={a.player_id} className="flex items-center justify-between gap-1">
                          <span className={`text-xs truncate ${i === 0 ? 'font-bold' : 'text-muted-foreground'}`}>
                            {i === 0 ? '★ ' : ''}{a.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{a.votes}v</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-500 mb-2">💩 Pereba</p>
                    <div className="space-y-1">
                      {awards.pereba.slice(0, 5).map((a, i) => (
                        <div key={a.player_id} className="flex items-center justify-between gap-1">
                          <span className={`text-xs truncate ${i === 0 ? 'font-bold' : 'text-muted-foreground'}`}>
                            {i === 0 ? '👎 ' : ''}{a.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{a.votes}v</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de presença */}
        {lista?.round && (
          <Card>
            <button
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 text-left rounded-t-xl"
              onClick={() => setListaAberta(v => !v)}
            >
              <div>
                <p className="font-semibold text-sm">Lista de presença</p>
                <p className="text-xs text-muted-foreground">
                  {lista.confirmados.length} confirmados
                  {lista.suplentes.length > 0 ? ` · ${lista.suplentes.length} suplentes` : ''}
                  {` · ${lista.ausentes.length} ausentes · ${lista.pendentes.length} sem resposta`}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">{listaAberta ? '▲' : '▼'}</span>
            </button>
            {listaAberta && (
              <CardContent className="border-t border-border pt-4 space-y-4">
                {lista.confirmados.length > 0 && <PresencaGrupo titulo="Confirmados" cor="green" jogadores={lista.confirmados} voterId={voterId} />}
                {lista.suplentes.length > 0 && <PresencaGrupo titulo="Suplentes" cor="yellow" jogadores={lista.suplentes} voterId={voterId} />}
                {lista.ausentes.length > 0 && <PresencaGrupo titulo="Ausentes" cor="red" jogadores={lista.ausentes} voterId={voterId} />}
                {lista.pendentes.length > 0 && <PresencaGrupo titulo="Sem resposta" cor="gray" jogadores={lista.pendentes} voterId={voterId} />}
              </CardContent>
            )}
          </Card>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/votar" className="block">
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <span className="text-2xl">🗳️</span>
                <span className="text-xs font-semibold text-center">Avaliar</span>
                <span className="text-xs text-muted-foreground text-center">
                  {voteCount > 0 ? `${voteCount} voto${voteCount !== 1 ? 's' : ''}` : 'Nenhum ainda'}
                </span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ranking" className="block">
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <span className="text-2xl">📊</span>
                <span className="text-xs font-semibold text-center">Ranking</span>
                <span className="text-xs text-muted-foreground text-center">Classificação</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/resultado" className="block">
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <span className="text-2xl">⚽</span>
                <span className="text-xs font-semibold text-center">Resultado</span>
                <span className="text-xs text-muted-foreground text-center">Ver times</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Histórico */}
        {pastEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Histórico de rodadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {pastEntries.map(entry => {
                  const att = entry.attendance ? ATTENDANCE_LABEL[entry.attendance] : null
                  return (
                    <div key={entry.round_id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(entry.scheduled_date)}</p>
                        <p className="text-xs text-muted-foreground">{STATUS_LABEL[entry.status ?? ''] ?? entry.status}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {att && <Badge variant="outline" className={`text-xs ${att.cls}`}>{att.label}</Badge>}
                        {entry.pote && <Badge className={`text-xs ${POTE_BADGE_CLS[entry.pote]}`}>P{entry.pote}</Badge>}
                        {entry.team && <Badge variant="outline" className="text-xs">T{entry.team}</Badge>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function PresencaGrupo({ titulo, cor, jogadores, voterId }: {
  titulo: string; cor: 'green' | 'yellow' | 'red' | 'gray'; jogadores: PlayerItem[]; voterId: number | null
}) {
  const colorMap = {
    green:  { dot: 'bg-green-500',  label: 'text-green-700',  badge: 'bg-green-50 text-green-700' },
    yellow: { dot: 'bg-yellow-400', label: 'text-yellow-700', badge: 'bg-yellow-50 text-yellow-700' },
    red:    { dot: 'bg-red-400',    label: 'text-red-600',    badge: 'bg-red-50 text-red-600' },
    gray:   { dot: 'bg-muted-foreground/40', label: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
  }
  const c = colorMap[cor]
  return (
    <div>
      <p className={`text-xs font-semibold ${c.label} mb-2 flex items-center gap-1.5`}>
        <span className={`w-2 h-2 rounded-full inline-block ${c.dot}`} />
        {titulo} ({jogadores.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {jogadores.map(j => (
          <span key={j.id}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.badge} ${j.id === voterId ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
            {j.name}
          </span>
        ))}
      </div>
    </div>
  )
}
