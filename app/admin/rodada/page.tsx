'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DateInput } from '@/components/DateInput'
import { formatDate, formatDateLong } from '@/lib/format'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'

interface Player { id: number; name: string; active: boolean }

interface RoundSummary {
  id: number
  scheduled_date: string
  status: string
  participant_count: number
}

interface RoundParticipant {
  player_id: number
  is_novice: boolean
  manual_pote: number | null
  ranking_index: number
  vote_count: number
  players: { id: number; name: string }
}

interface PotEntry { player_id: number; pote: number; players: { id: number; name: string } }
interface TeamEntry { team: number; player_id: number; pote: number; players: { id: number; name: string } }

interface RoundDetails {
  round: { id: number; scheduled_date: string; status: string }
  participants: RoundParticipant[]
  pots: PotEntry[]
  teams: TeamEntry[]
}

interface AwardEntry { player_id: number; name: string; votes: number }
interface AwardsData { mvp: AwardEntry[]; pereba: AwardEntry[] }

const POTE_BADGE_CLASS: Record<number, string> = {
  1: 'bg-blue-900 text-white border-0',
  2: 'bg-blue-700 text-white border-0',
  3: 'bg-blue-500 text-white border-0',
  4: 'bg-slate-500 text-white border-0',
  5: 'bg-slate-400 text-white border-0',
  6: 'bg-slate-200 text-slate-700 border-0',
}

const TEAM_HEADER_CLASS = ['bg-blue-700 text-white', 'bg-sky-500 text-white', 'bg-orange-500 text-white']

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:  { label: 'Em preparação', variant: 'secondary' },
  open:   { label: 'Aberta',        variant: 'outline' },
  drawn:  { label: 'Sorteada',      variant: 'default' },
  closed: { label: 'Encerrada',     variant: 'secondary' },
}

export default function AdminRodadaPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [roundList, setRoundList] = useState<RoundSummary[]>([])
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null)
  const [roundDetails, setRoundDetails] = useState<Record<number, RoundDetails>>({})
  const [awardsMap, setAwardsMap] = useState<Record<number, AwardsData>>({})
  const [resultsRevealed, setResultsRevealed] = useState(false)

  const [expandedId, setExpandedId] = useState<string>('')
  const [newRoundDate, setNewRoundDate] = useState('')
  const [newRoundOpen, setNewRoundOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Per-round action states
  const [buildingPots, setBuildingPots] = useState<number | null>(null)
  const [drawing, setDrawing] = useState<number | null>(null)
  const [closing, setClosing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [toggling, setToggling] = useState(false)
  const [subOut, setSubOut] = useState<number | null>(null)

  // Novato form
  const [novatoNome, setNovatoNome] = useState('')
  const [novatoPote, setNovatoPote] = useState(6)
  const [adicionandoNovato, setAdicionandoNovato] = useState(false)
  const [showNovatoForm, setShowNovatoForm] = useState(false)

  async function fetchRoundList(pwd: string) {
    const [listRes, playersRes, statusRes] = await Promise.all([
      fetch('/api/admin/rounds/list', { headers: { 'x-admin-password': pwd } }),
      fetch('/api/admin/players', { headers: { 'x-admin-password': pwd } }),
      fetch('/api/admin/status', { headers: { 'x-admin-password': pwd } }),
    ])
    if (!listRes.ok) return false
    const [listData, playersData, statusData] = await Promise.all([
      listRes.json(), playersRes.json(), statusRes.json(),
    ])
    setRoundList(listData.rounds || [])
    setActiveRoundId(listData.active_round_id ?? null)
    setAllPlayers(playersData || [])
    setResultsRevealed(!!statusData?.results_revealed)
    return true
  }

  const fetchRoundDetails = useCallback(async (roundId: number, pwd: string) => {
    const [detailsRes, awardsRes] = await Promise.all([
      fetch(`/api/admin/rounds/${roundId}`, { headers: { 'x-admin-password': pwd } }),
      fetch(`/api/awards?round_id=${roundId}`),
    ])
    if (detailsRes.ok) {
      const data = await detailsRes.json()
      setRoundDetails(prev => ({ ...prev, [roundId]: data }))
    }
    if (awardsRes.ok) {
      const aw = await awardsRes.json()
      setAwardsMap(prev => ({ ...prev, [roundId]: aw }))
    }
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchRoundList(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [])

  // Load details when accordion opens
  useEffect(() => {
    const id = Number(expandedId)
    if (!id || !password) return
    if (!roundDetails[id]) {
      fetchRoundDetails(id, password)
    }
  }, [expandedId, password, roundDetails, fetchRoundDetails])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const ok = await fetchRoundList(password)
    if (!ok) { setAuthError('Senha incorreta') }
    else { sessionStorage.setItem('baba_admin_pwd', password); setAuthenticated(true) }
    setLoading(false)
  }

  async function handleCreateRound(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoundDate) return
    setCreating(true)
    const res = await fetch('/api/admin/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ scheduled_date: newRoundDate }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewRoundDate('')
      setNewRoundOpen(false)
      await fetchRoundList(password)
      setExpandedId(String(data.id))
      toast.success('Rodada criada!')
    } else {
      toast.error(data.error || 'Erro ao criar rodada')
    }
    setCreating(false)
  }

  async function handleToggleParticipant(roundId: number, playerId: number, confirmed: boolean) {
    const res = await fetch(`/api/admin/rounds/${roundId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: playerId, confirmed }),
    })
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return }
    await fetchRoundDetails(roundId, password)
    await fetchRoundList(password)
  }

  async function handleNoviceChange(roundId: number, playerId: number, isNovice: boolean, manualPote: number | null) {
    await fetch(`/api/admin/rounds/${roundId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: playerId, confirmed: true, is_novice: isNovice, manual_pote: manualPote }),
    })
    await fetchRoundDetails(roundId, password)
  }

  async function handleBuildPots(roundId: number) {
    setBuildingPots(roundId)
    const res = await fetch(`/api/admin/rounds/${roundId}/build-pots`, {
      method: 'POST', headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro ao montar potes') }
    else { await fetchRoundDetails(roundId, password); toast.success('Potes montados!') }
    setBuildingPots(null)
  }

  async function handleDraw(roundId: number) {
    setDrawing(roundId)
    const res = await fetch(`/api/admin/rounds/${roundId}/draw`, {
      method: 'POST', headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro ao sortear') }
    else { await fetchRoundDetails(roundId, password); await fetchRoundList(password); toast.success('Times sorteados!') }
    setDrawing(null)
  }

  async function handleCloseRound(roundId: number) {
    setClosing(roundId)
    const res = await fetch(`/api/admin/rounds/${roundId}/close`, {
      method: 'POST', headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro ao encerrar') }
    else { await fetchRoundDetails(roundId, password); await fetchRoundList(password); toast.success('Rodada encerrada!') }
    setClosing(null)
  }

  async function handleDeleteRound(roundId: number, date: string) {
    if (!confirm(`Excluir a rodada de ${formatDate(date)}? Esta ação não pode ser desfeita.`)) return
    setDeleting(roundId)
    const res = await fetch(`/api/admin/rounds/${roundId}`, {
      method: 'DELETE', headers: { 'x-admin-password': password },
    })
    if (res.ok) {
      setExpandedId('')
      setRoundDetails(prev => { const n = { ...prev }; delete n[roundId]; return n })
      await fetchRoundList(password)
      toast.success('Rodada excluída.')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Erro ao excluir')
    }
    setDeleting(null)
  }

  async function handleSubstitute(roundId: number, playerInId: number) {
    if (!subOut) return
    const res = await fetch(`/api/admin/rounds/${roundId}/substitute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_out_id: subOut, player_in_id: playerInId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro na substituição'); return }
    setSubOut(null)
    await fetchRoundDetails(roundId, password)
    toast.success('Substituição realizada!')
  }

  async function handleCadastrarNovato(e: React.FormEvent, roundId: number) {
    e.preventDefault()
    if (!novatoNome.trim()) return
    setAdicionandoNovato(true)
    const playerRes = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ name: novatoNome.trim(), is_novice: true }),
    })
    const player = await playerRes.json()
    if (!playerRes.ok) { toast.error(player.error || 'Erro ao criar jogador'); setAdicionandoNovato(false); return }

    const partRes = await fetch(`/api/admin/rounds/${roundId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: player.id, confirmed: true, is_novice: true, manual_pote: novatoPote }),
    })
    if (!partRes.ok) { const d = await partRes.json(); toast.error(d.error || 'Erro ao adicionar'); setAdicionandoNovato(false); return }

    setNovatoNome(''); setNovatoPote(6); setShowNovatoForm(false)
    await fetchRoundDetails(roundId, password)
    await fetchRoundList(password)
    toast.success(`${player.name} cadastrado no Pote ${novatoPote}!`)
    setAdicionandoNovato(false)
  }

  async function handleSyncAttendance(roundId: number) {
    setSyncing(roundId)
    const res = await fetch(`/api/admin/rounds/${roundId}/sync-attendance`, {
      method: 'POST', headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro') }
    else { toast.success(`Presença aplicada para ${data.synced} jogadores!`) }
    setSyncing(null)
  }

  async function toggleReveal() {
    setToggling(true)
    await fetch('/api/admin/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ reveal: !resultsRevealed }),
    })
    setResultsRevealed(r => !r)
    toast.success(!resultsRevealed ? 'Resultado revelado!' : 'Resultado ocultado.')
    setToggling(false)
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
            <CardTitle>Admin — Rodada</CardTitle>
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
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AdminLayout>
    <div>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Rodadas</h1>
          <div className="flex items-center gap-3">
            <Dialog open={newRoundOpen} onOpenChange={setNewRoundOpen}>
              <DialogTrigger asChild>
                <Button size="sm">+ Nova rodada</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Nova rodada</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRound} className="space-y-4 pt-2">
                  <DateInput
                    value={newRoundDate}
                    onChange={setNewRoundDate}
                    className="w-full h-10 px-3 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar rodada'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {roundList.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma rodada criada ainda.</p>
            <Button className="mt-4" onClick={() => setNewRoundOpen(true)}>Criar primeira rodada</Button>
          </Card>
        )}

        <Accordion
          type="single"
          collapsible
          value={expandedId}
          onValueChange={setExpandedId}
          className="space-y-2"
        >
          {roundList.map(r => {
            const st = STATUS_MAP[r.status] ?? { label: r.status, variant: 'secondary' as const }
            const details = roundDetails[r.id]
            const awards = awardsMap[r.id]
            const isActive = r.id === activeRoundId
            const confirmedIds = new Set((details?.participants || []).map(p => p.player_id))
            const confirmedCount = confirmedIds.size
            const potsBuilt = (details?.pots?.length ?? 0) >= 18
            const drawn = r.status === 'drawn' || r.status === 'closed'
            const canSubstitute = r.status === 'drawn'
            const canBuildPots = confirmedCount === 18 && !potsBuilt && r.status !== 'drawn' && r.status !== 'closed'

            const byPote: Record<number, PotEntry[]> = {}
            for (const p of details?.pots || []) {
              if (!byPote[p.pote]) byPote[p.pote] = []
              byPote[p.pote].push(p)
            }
            const byTeam: Record<number, TeamEntry[]> = {}
            for (const t of details?.teams || []) {
              if (!byTeam[t.team]) byTeam[t.team] = []
              byTeam[t.team].push(t)
            }
            const inTeamIds = new Set((details?.teams || []).map(t => t.player_id))
            const potPlayers = subOut ? allPlayers.filter(p => !inTeamIds.has(p.id) && p.id !== subOut) : []

            return (
              <AccordionItem
                key={r.id}
                value={String(r.id)}
                className={`bg-card rounded-xl border ${isActive ? 'border-primary/40 shadow-sm' : 'border-border'}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:text-muted-foreground">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <p className="font-semibold text-sm">{formatDateLong(r.scheduled_date)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={st.variant} className="text-xs h-5">{st.label}</Badge>
                        {isActive && <Badge variant="outline" className="text-xs h-5 border-primary/50 text-primary">Ativa</Badge>}
                        <span className="text-xs text-muted-foreground">{r.participant_count}/18</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* Carregando detalhes */}
                  {!details && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">Carregando...</p>
                    </div>
                  )}

                  {details && (
                    <>
                      {/* Ações rápidas da rodada */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {r.status !== 'closed' && r.status !== 'drawn' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBuildPots(r.id)}
                            disabled={!canBuildPots || buildingPots === r.id}
                          >
                            {buildingPots === r.id ? 'Montando...' : potsBuilt ? 'Remontar potes' : 'Montar potes'}
                          </Button>
                        )}
                        {potsBuilt && r.status !== 'drawn' && r.status !== 'closed' && (
                          <Button
                            size="sm"
                            onClick={() => handleDraw(r.id)}
                            disabled={drawing === r.id}
                          >
                            {drawing === r.id ? 'Sorteando...' : 'Sortear times'}
                          </Button>
                        )}
                        {potsBuilt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncAttendance(r.id)}
                            disabled={syncing === r.id}
                          >
                            {syncing === r.id ? '...' : 'Aplicar presença'}
                          </Button>
                        )}
                        {r.status === 'drawn' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCloseRound(r.id)}
                            disabled={closing === r.id}
                          >
                            {closing === r.id ? 'Encerrando...' : 'Encerrar rodada'}
                          </Button>
                        )}
                        {drawn && (
                          <Button
                            variant={resultsRevealed ? 'secondary' : 'default'}
                            size="sm"
                            onClick={toggleReveal}
                            disabled={toggling}
                          >
                            {toggling ? '...' : resultsRevealed ? 'Ocultar resultado' : 'Revelar resultado'}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRound(r.id, r.scheduled_date)}
                          disabled={deleting === r.id}
                        >
                          {deleting === r.id ? '...' : 'Excluir'}
                        </Button>
                      </div>

                      <Separator />

                      {/* Confirmação de presença (só rounds não sorteados) */}
                      {r.status !== 'drawn' && r.status !== 'closed' && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold">
                                Participantes <span className={`${confirmedCount === 18 ? 'text-primary' : 'text-muted-foreground'}`}>{confirmedCount}/18</span>
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNovatoForm(v => !v)}
                              >
                                {showNovatoForm ? 'Fechar' : '+ Novato'}
                              </Button>
                            </div>

                            {showNovatoForm && (
                              <form onSubmit={e => handleCadastrarNovato(e, r.id)} className="flex gap-2 mb-3 flex-wrap">
                                <input
                                  type="text"
                                  value={novatoNome}
                                  onChange={e => setNovatoNome(e.target.value)}
                                  placeholder="Nome do novato"
                                  className="flex-1 min-w-0 h-9 px-3 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <select
                                  value={novatoPote}
                                  onChange={e => setNovatoPote(Number(e.target.value))}
                                  className="h-9 px-2 border border-input rounded-md text-sm bg-background"
                                >
                                  {[1,2,3,4,5,6].map(p => <option key={p} value={p}>Pote {p}</option>)}
                                </select>
                                <Button size="sm" type="submit" disabled={adicionandoNovato || !novatoNome.trim()}>
                                  {adicionandoNovato ? '...' : 'Cadastrar'}
                                </Button>
                              </form>
                            )}

                            <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
                              {allPlayers.filter(p => p.active).map(player => {
                                const isConfirmed = confirmedIds.has(player.id)
                                const participant = details.participants.find(p => p.player_id === player.id)
                                const isNovice = participant?.is_novice ?? false
                                const manualPote = participant?.manual_pote ?? null
                                return (
                                  <div key={player.id} className={`px-3 py-2 flex items-center gap-2 ${isConfirmed ? 'bg-primary/5' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={isConfirmed}
                                      onChange={e => handleToggleParticipant(r.id, player.id, e.target.checked)}
                                      disabled={!isConfirmed && confirmedCount >= 18}
                                      className="h-4 w-4 rounded border-input text-primary"
                                    />
                                    <span className="flex-1 text-sm">{player.name}</span>
                                    {participant && (
                                      <span className="text-xs text-muted-foreground">
                                        {Number(participant.ranking_index).toFixed(2)}
                                      </span>
                                    )}
                                    {isConfirmed && (
                                      <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <input
                                            type="checkbox"
                                            checked={isNovice}
                                            onChange={e => handleNoviceChange(r.id, player.id, e.target.checked, e.target.checked ? (manualPote ?? 6) : null)}
                                            className="h-3 w-3 rounded border-input"
                                          />
                                          Novato
                                        </label>
                                        {isNovice && (
                                          <select
                                            value={manualPote ?? ''}
                                            onChange={e => handleNoviceChange(r.id, player.id, true, Number(e.target.value))}
                                            className="h-7 px-1 border border-orange-300 rounded text-xs text-orange-700 bg-orange-50"
                                          >
                                            {[1,2,3,4,5,6].map(p => <option key={p} value={p}>P{p}</option>)}
                                          </select>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Potes */}
                      {(details.pots?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Potes</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[1,2,3,4,5,6].map(pote => {
                              const jogadores = byPote[pote] || []
                              if (!jogadores.length) return null
                              return (
                                <div key={pote} className="bg-muted/40 rounded-lg p-2.5">
                                  <Badge className={`text-xs mb-1.5 ${POTE_BADGE_CLASS[pote]}`}>Pote {pote}</Badge>
                                  <div className="space-y-0.5">
                                    {jogadores.map(e => (
                                      <p key={e.player_id} className="text-xs text-foreground truncate">{e.players.name}</p>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Times */}
                      {(details.teams?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Times</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[1,2,3].map(team => (
                              <div key={team} className="bg-card rounded-xl border border-border overflow-hidden">
                                <div className={`px-3 py-1.5 text-xs font-bold text-center ${TEAM_HEADER_CLASS[team-1]}`}>
                                  Time {team}
                                </div>
                                <div className="p-2 space-y-1">
                                  {(byTeam[team] || []).sort((a,b) => a.pote - b.pote).map(entry => (
                                    <div key={entry.player_id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-md px-2 py-1">
                                      <span className="text-xs font-medium truncate">{entry.players.name}</span>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge className={`text-xs h-5 ${POTE_BADGE_CLASS[entry.pote]}`}>P{entry.pote}</Badge>
                                        {canSubstitute && (
                                          <button
                                            onClick={() => setSubOut(subOut === entry.player_id ? null : entry.player_id)}
                                            className="text-xs text-muted-foreground hover:text-orange-500 px-1"
                                            title="Substituir"
                                          >
                                            ⇄
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {subOut && (
                            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <p className="text-sm font-semibold text-orange-800 mb-2">
                                Substituir <span className="text-orange-600">{(details.teams || []).find(t => t.player_id === subOut)?.players.name}</span> por:
                              </p>
                              {potPlayers.length === 0 ? (
                                <p className="text-sm text-orange-700">Todos os jogadores ativos já estão em um time.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {potPlayers.map(p => (
                                    <Button key={p.id} variant="outline" size="sm" onClick={() => handleSubstitute(r.id, p.id)}>
                                      {p.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSubOut(null)}>Cancelar</Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* MVP e Pereba */}
                      {drawn && awards && (awards.mvp.length > 0 || awards.pereba.length > 0) && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">MVP & Pereba</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-muted/30 rounded-lg p-3">
                                <p className="text-xs font-semibold text-yellow-600 mb-2">🏆 MVP</p>
                                <div className="space-y-1">
                                  {awards.mvp.slice(0, 5).map((a, i) => (
                                    <div key={a.player_id} className="flex items-center justify-between gap-1">
                                      <span className={`text-xs truncate ${i === 0 ? 'font-bold' : 'text-muted-foreground'}`}>
                                        {i === 0 ? '★ ' : ''}{a.name}
                                      </span>
                                      <span className="text-xs font-semibold text-muted-foreground">{a.votes}v</span>
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
                                      <span className="text-xs font-semibold text-muted-foreground">{a.votes}v</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
    </AdminLayout>
  )
}
