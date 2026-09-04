'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DateInput } from '@/components/DateInput'
import { formatDate, formatDateLong } from '@/lib/format'

interface Player {
  id: number
  name: string
  active: boolean
}

interface RoundParticipant {
  player_id: number
  is_novice: boolean
  manual_pote: number | null
  ranking_index: number
  vote_count: number
  players: { id: number; name: string }
}

interface PotEntry {
  player_id: number
  pote: number
  players: { id: number; name: string }
}

interface TeamEntry {
  team: number
  player_id: number
  pote: number
  players: { id: number; name: string }
}

interface ActiveRoundData {
  round: { id: number; scheduled_date: string; status: string }
  participants: RoundParticipant[]
  pots: PotEntry[]
  teams: TeamEntry[]
}

const POTE_BADGE: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-green-500 text-white',
  3: 'bg-green-400 text-white',
  4: 'bg-gray-500 text-white',
  5: 'bg-gray-400 text-white',
  6: 'bg-gray-300 text-gray-700',
}

const TEAM_HEADER = [
  'bg-green-500 text-white',
  'bg-blue-500 text-white',
  'bg-orange-500 text-white',
]

export default function AdminRodadaPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [roundData, setRoundData] = useState<ActiveRoundData | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [buildingPots, setBuildingPots] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Cadastro de novato
  const [novatoNome, setNovatoNome] = useState('')
  const [novatoPote, setNovatoPote] = useState<number>(6)
  const [adicionandoNovato, setAdicionandoNovato] = useState(false)
  const [showNovatoForm, setShowNovatoForm] = useState(false)

  // Substituição
  const [subOut, setSubOut] = useState<number | null>(null)

  const fetchAll = useCallback(async (pwd: string) => {
    const [playersRes, roundRes] = await Promise.all([
      fetch('/api/admin/players', { headers: { 'x-admin-password': pwd } }),
      fetch('/api/admin/rounds', { headers: { 'x-admin-password': pwd } }),
    ])
    if (!playersRes.ok) return false
    const [playersData, roundRaw] = await Promise.all([playersRes.json(), roundRes.json()])
    setAllPlayers(playersData)
    setRoundData(roundRaw)
    return true
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('baba_admin_pwd')
    if (!saved) { setChecking(false); return }
    setPassword(saved)
    fetchAll(saved).then(ok => {
      if (ok) setAuthenticated(true)
      setChecking(false)
    })
  }, [fetchAll])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const ok = await fetchAll(password)
    if (!ok) {
      setAuthError('Senha incorreta')
    } else {
      sessionStorage.setItem('baba_admin_pwd', password)
      setAuthenticated(true)
    }
    setLoading(false)
  }

  async function handleCreateRound(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return
    setCreating(true)
    setError('')
    const res = await fetch('/api/admin/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ scheduled_date: newDate }),
    })
    if (res.ok) {
      setNewDate('')
      await fetchAll(password)
      showMessage('Rodada criada!')
    }
    setCreating(false)
  }

  async function handleToggleParticipant(playerId: number, confirmed: boolean) {
    if (!roundData) return
    setError('')
    const res = await fetch(`/api/admin/rounds/${roundData.round.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: playerId, confirmed }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro'); return }
    await fetchAll(password)
  }

  async function handleNoviceChange(playerId: number, isNovice: boolean, manualPote: number | null) {
    if (!roundData) return
    await fetch(`/api/admin/rounds/${roundData.round.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: playerId, confirmed: true, is_novice: isNovice, manual_pote: manualPote }),
    })
    await fetchAll(password)
  }

  async function handleBuildPots() {
    if (!roundData) return
    setBuildingPots(true)
    setError('')
    const res = await fetch(`/api/admin/rounds/${roundData.round.id}/build-pots`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao montar potes'); setBuildingPots(false); return }
    await fetchAll(password)
    showMessage('Potes montados!')
    setBuildingPots(false)
  }

  async function handleDraw() {
    if (!roundData) return
    setDrawing(true)
    setError('')
    const res = await fetch(`/api/admin/rounds/${roundData.round.id}/draw`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao sortear'); setDrawing(false); return }
    await fetchAll(password)
    showMessage('Times sorteados!')
    setDrawing(false)
  }

  async function handleCloseRound() {
    if (!roundData) return
    setClosing(true)
    setError('')
    const res = await fetch(`/api/admin/rounds/${roundData.round.id}/close`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao encerrar'); setClosing(false); return }
    await fetchAll(password)
    showMessage('Rodada encerrada!')
    setClosing(false)
  }

  async function handleSubstitute(playerInId: number) {
    if (!roundData || !subOut) return
    setError('')
    const res = await fetch(`/api/admin/rounds/${roundData.round.id}/substitute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_out_id: subOut, player_in_id: playerInId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro na substituição'); return }
    setSubOut(null)
    await fetchAll(password)
    showMessage('Substituição realizada!')
  }

  async function handleCadastrarNovato(e: React.FormEvent) {
    e.preventDefault()
    if (!novatoNome.trim() || !novatoPote || !roundData) return
    setAdicionandoNovato(true)
    setError('')

    // 1. Cria o jogador
    const playerRes = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ name: novatoNome.trim() }),
    })
    const player = await playerRes.json()
    if (!playerRes.ok) { setError(player.error || 'Erro ao criar jogador'); setAdicionandoNovato(false); return }

    // 2. Adiciona à rodada como novato com pote manual
    const partRes = await fetch(`/api/admin/rounds/${roundData.round.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ player_id: player.id, confirmed: true, is_novice: true, manual_pote: novatoPote }),
    })
    const partData = await partRes.json()
    if (!partRes.ok) { setError(partData.error || 'Erro ao adicionar à rodada'); setAdicionandoNovato(false); return }

    setNovatoNome('')
    setNovatoPote(6)
    setShowNovatoForm(false)
    await fetchAll(password)
    showMessage(`${player.name} cadastrado como novato no Pote ${novatoPote}!`)
    setAdicionandoNovato(false)
  }

  function showMessage(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Verificando sessão...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900">Admin — Rodada</h1>
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

  const confirmedIds = new Set((roundData?.participants || []).map(p => p.player_id))
  const confirmedCount = confirmedIds.size
  const canBuildPots = confirmedCount === 18 && (roundData?.pots?.length ?? 0) === 0
  const potsBuilt = (roundData?.pots?.length ?? 0) === 18
  const drawn = roundData?.round?.status === 'drawn' || roundData?.round?.status === 'closed'
  const canSubstitute = roundData?.round?.status === 'drawn'

  // Organiza potes para exibição
  const byPote: Record<number, PotEntry[]> = {}
  for (const p of roundData?.pots || []) {
    if (!byPote[p.pote]) byPote[p.pote] = []
    byPote[p.pote].push(p)
  }

  // Organiza times para exibição
  const byTeam: Record<number, TeamEntry[]> = {}
  for (const t of roundData?.teams || []) {
    if (!byTeam[t.team]) byTeam[t.team] = []
    byTeam[t.team].push(t)
  }

  // Para substituição: jogador que sai e quem pode entrar
  const subOutEntry = subOut ? (roundData?.teams || []).find(t => t.player_id === subOut) : null
  const inTeamIds = new Set((roundData?.teams || []).map(t => t.player_id))
  // Qualquer jogador ativo que não está em nenhum time pode substituir
  const potPlayers = subOut
    ? allPlayers.filter(p => !inTeamIds.has(p.id) && p.id !== subOut)
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Rodada</h1>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm text-center font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Criar rodada */}
        {!roundData?.round && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Nova rodada</h2>
            <form onSubmit={handleCreateRound} className="flex gap-2">
              <DateInput
                value={newDate}
                onChange={setNewDate}
                className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 h-10 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {creating ? '...' : 'Criar'}
              </button>
            </form>
          </div>
        )}

        {roundData?.round && (
          <>
            {/* Info da rodada */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDateLong(roundData.round.scheduled_date)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${drawn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {drawn ? 'Sorteado' : 'Em preparação'}
                </span>
              </div>
              <span className={`text-2xl font-bold ${confirmedCount === 18 ? 'text-green-600' : 'text-gray-400'}`}>
                {confirmedCount}/18
              </span>
            </div>

            {/* Cadastrar novato */}
            {!drawn && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">Cadastrar novato</h2>
                    <p className="text-xs text-gray-400">Cria o jogador e já adiciona à rodada com pote manual.</p>
                  </div>
                  <button
                    onClick={() => setShowNovatoForm(v => !v)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    {showNovatoForm ? 'Fechar' : '+ Adicionar'}
                  </button>
                </div>
                {showNovatoForm && (
                  <form onSubmit={handleCadastrarNovato} className="px-4 py-3 flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={novatoNome}
                      onChange={e => setNovatoNome(e.target.value)}
                      placeholder="Nome do novato"
                      className="flex-1 min-w-0 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                    <select
                      value={novatoPote}
                      onChange={e => setNovatoPote(Number(e.target.value))}
                      className="h-10 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {[1,2,3,4,5,6].map(p => (
                        <option key={p} value={p}>Pote {p}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={adicionandoNovato || !novatoNome.trim()}
                      className="h-10 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {adicionandoNovato ? '...' : 'Cadastrar'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Lista de jogadores para confirmar presença */}
            {!drawn && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">Confirmação de presença</h2>
                  <p className="text-xs text-gray-400">Marque os 18 que vão jogar. Novatos precisam de pote manual.</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {allPlayers.filter(p => p.active).map(player => {
                    const isConfirmed = confirmedIds.has(player.id)
                    const participant = roundData.participants.find(p => p.player_id === player.id)
                    const isNovice = participant?.is_novice ?? false
                    const manualPote = participant?.manual_pote ?? null

                    return (
                      <div key={player.id} className={`px-4 py-2.5 flex items-center gap-3 ${isConfirmed ? 'bg-green-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isConfirmed}
                          onChange={e => handleToggleParticipant(player.id, e.target.checked)}
                          disabled={!isConfirmed && confirmedCount >= 18}
                          className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">{player.name}</span>
                          {participant && (
                            <span className="ml-2 text-xs text-gray-400">
                              idx: {Number(participant.ranking_index).toFixed(2)}
                              {participant.vote_count === 0 && ' · sem votos'}
                            </span>
                          )}
                        </div>
                        {isConfirmed && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <label className="flex items-center gap-1 text-xs text-gray-500">
                              <input
                                type="checkbox"
                                checked={isNovice}
                                onChange={e => handleNoviceChange(player.id, e.target.checked, e.target.checked ? (manualPote ?? 6) : null)}
                                className="h-3 w-3 text-orange-500 rounded border-gray-300"
                              />
                              Novato
                            </label>
                            {isNovice && (
                              <select
                                value={manualPote ?? ''}
                                onChange={e => handleNoviceChange(player.id, true, Number(e.target.value))}
                                className="h-7 px-1 border border-orange-300 rounded text-xs text-orange-700 bg-orange-50 focus:outline-none"
                              >
                                <option value="">Pote</option>
                                {[1,2,3,4,5,6].map(p => (
                                  <option key={p} value={p}>Pote {p}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ações */}
            {!drawn && (
              <div className="flex gap-3">
                <button
                  onClick={handleBuildPots}
                  disabled={!canBuildPots || buildingPots}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {buildingPots ? 'Montando...' : potsBuilt ? 'Remontar potes' : 'Montar potes'}
                </button>
                {potsBuilt && (
                  <button
                    onClick={handleDraw}
                    disabled={drawing}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    {drawing ? 'Sorteando...' : 'Sortear times'}
                  </button>
                )}
              </div>
            )}

            {/* Potes montados */}
            {(roundData.pots?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Potes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(pote => (
                    <div key={pote} className="bg-white rounded-xl border border-gray-200 p-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POTE_BADGE[pote]}`}>Pote {pote}</span>
                      <div className="mt-2 space-y-1">
                        {(byPote[pote] || []).map(e => (
                          <div key={e.player_id} className="text-xs text-gray-700 truncate">{e.players.name}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Times sorteados */}
            {drawn && (roundData.teams?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Times</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1,2,3].map(team => (
                    <div key={team} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className={`px-4 py-2 font-bold text-sm text-center ${TEAM_HEADER[team-1]}`}>
                        Time {team}
                      </div>
                      <div className="p-3 space-y-1.5">
                        {(byTeam[team] || []).sort((a,b) => a.pote - b.pote).map(entry => (
                          <div key={entry.player_id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                            <span className="text-xs font-medium text-gray-900 truncate">{entry.players.name}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${POTE_BADGE[entry.pote]}`}>
                                P{entry.pote}
                              </span>
                              {canSubstitute && (
                                <button
                                  onClick={() => setSubOut(subOut === entry.player_id ? null : entry.player_id)}
                                  className="text-xs text-gray-400 hover:text-orange-500 px-1"
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

                {/* Modal de substituição inline */}
                {subOut && potPlayers.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-3">
                    <p className="text-sm font-semibold text-orange-800 mb-2">
                      Substituir <span className="text-orange-600">{(roundData.teams || []).find(t => t.player_id === subOut)?.players.name}</span> por:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {potPlayers.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSubstitute(p.id)}
                          className="px-3 py-1.5 bg-white border border-orange-300 text-orange-700 text-sm rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setSubOut(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
                      Cancelar
                    </button>
                  </div>
                )}

                {subOut && potPlayers.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3 text-sm text-yellow-700">
                    Todos os jogadores ativos já estão em um time.
                    <button onClick={() => setSubOut(null)} className="ml-2 text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                  </div>
                )}
              </div>
            )}

            {drawn && roundData.round.status !== 'closed' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-1">Encerrar rodada</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Confirme que a partida aconteceu e arquive esta rodada. Após encerrada, não será possível fazer substituições.
                </p>
                <button
                  onClick={handleCloseRound}
                  disabled={closing}
                  className="w-full h-11 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {closing ? 'Encerrando...' : 'Encerrar rodada'}
                </button>
              </div>
            )}

            {roundData.round.status === 'closed' && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
                <p className="text-sm font-semibold text-gray-500">Rodada encerrada</p>
                <p className="text-xs text-gray-400 mt-0.5">A partida foi realizada e a rodada está arquivada.</p>
              </div>
            )}

            {drawn && (
              <div className="text-center">
                <Link href="/resultado" className="text-sm text-green-600 hover:underline">
                  Ver resultado público →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
