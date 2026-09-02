'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Participant {
  id: number
  name: string
}

const POTE_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
  1: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800', badge: 'bg-green-600' },
  2: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', badge: 'bg-green-700' },
  3: { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-900', badge: 'bg-green-800' },
  4: { bg: 'bg-gray-50',  border: 'border-gray-400',  text: 'text-gray-800',  badge: 'bg-gray-600'  },
  5: { bg: 'bg-gray-50',  border: 'border-gray-500',  text: 'text-gray-800',  badge: 'bg-gray-700'  },
  6: { bg: 'bg-gray-50',  border: 'border-gray-600',  text: 'text-gray-900',  badge: 'bg-gray-800'  },
}

export default function VotarPage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState('')
  const [voterId, setVoterId] = useState<number | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [potes, setPotes] = useState<Record<number, number[]>>({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] })
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const id = sessionStorage.getItem('baba_voter_id')
    const name = sessionStorage.getItem('baba_voter_name')
    if (!id || !name) { router.replace('/'); return }
    setVoterId(Number(id))
    setVoterName(name)

    fetch('/api/participants')
      .then(r => r.json())
      .then((data: { id: number; name: string }[]) => {
        setParticipants(data.filter(p => p.id !== Number(id)))
        setLoading(false)
      })
  }, [router])

  const assignedIds = Object.values(potes).flat()
  const available = participants.filter(p => !assignedIds.includes(p.id))

  const totalAssigned = assignedIds.length
  const isComplete = Object.values(potes).every(p => p.length === 3)

  function getPersonPote(id: number): number | null {
    for (const [pote, ids] of Object.entries(potes)) {
      if (ids.includes(id)) return Number(pote)
    }
    return null
  }

  function handlePersonClick(id: number) {
    const personPote = getPersonPote(id)
    if (personPote !== null) {
      // remove from pote
      setPotes(prev => ({
        ...prev,
        [personPote]: prev[personPote].filter(x => x !== id),
      }))
      setSelected(null)
      return
    }
    setSelected(prev => prev === id ? null : id)
  }

  function handlePoteClick(pote: number) {
    if (selected === null) return
    if (potes[pote].length >= 3) return
    setPotes(prev => ({ ...prev, [pote]: [...prev[pote], selected] }))
    setSelected(null)
  }

  async function handleSubmit() {
    if (!isComplete || !voterId) return
    setSubmitting(true)

    const votes: { voted_for_id: number; pote: number }[] = []
    for (const [pote, ids] of Object.entries(potes)) {
      for (const id of ids) {
        votes.push({ voted_for_id: id, pote: Number(pote) })
      }
    }

    sessionStorage.setItem('baba_votes', JSON.stringify(
      votes.map(v => ({
        voted_for_id: v.voted_for_id,
        voted_for_name: participants.find(p => p.id === v.voted_for_id)?.name ?? '',
        pote: v.pote,
      }))
    ))
    router.push('/resumo')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900">⚽ Baba Lets</span>
            <span className="text-gray-400 text-sm ml-2">— {voterName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{totalAssigned}/18</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(totalAssigned / 18) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Instruction */}
        {selected !== null ? (
          <div className="bg-green-600 text-white rounded-xl px-4 py-3 text-sm font-medium text-center">
            {participants.find(p => p.id === selected)?.name} selecionado — toque em um pote para alocar
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm text-center">
            Toque em uma pessoa para selecioná-la, depois toque em um pote. 3 por pote.
          </div>
        )}

        {/* Available people */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Disponíveis ({available.length})
          </h2>
          {available.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-3">Todos alocados!</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {available.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePersonClick(p.id)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                    selected === p.id
                      ? 'bg-green-600 border-green-600 text-white shadow-md scale-105'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Potes grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(pote => {
            const c = POTE_COLORS[pote]
            const slots = potes[pote]
            const isFull = slots.length >= 3
            const canReceive = selected !== null && !isFull

            return (
              <div
                key={pote}
                onClick={() => handlePoteClick(pote)}
                className={`rounded-xl border-2 p-3 transition-all ${c.bg} ${c.border} ${
                  canReceive ? 'cursor-pointer ring-2 ring-offset-1 ring-green-400 shadow-md' : ''
                } ${isFull ? 'opacity-90' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`${c.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                    Pote {pote}
                  </span>
                  <span className="text-xs text-gray-400">{slots.length}/3</span>
                </div>
                <div className="space-y-1.5">
                  {slots.map(id => {
                    const person = participants.find(p => p.id === id)
                    return (
                      <button
                        key={id}
                        onClick={e => { e.stopPropagation(); handlePersonClick(id) }}
                        className="w-full text-left bg-white rounded-lg px-2 py-1.5 text-sm font-medium text-gray-800 hover:bg-red-50 hover:text-red-600 border border-gray-200 transition-colors"
                        title="Toque para remover"
                      >
                        {person?.name}
                      </button>
                    )
                  })}
                  {Array.from({ length: 3 - slots.length }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-full h-8 rounded-lg border border-dashed ${
                        canReceive ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit */}
        <div className="pb-6">
          <button
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors shadow-sm"
          >
            {submitting ? 'Salvando...' : isComplete ? 'Ver Resumo e Confirmar →' : `Faltam ${18 - totalAssigned} pessoas`}
          </button>
          {!isComplete && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Complete todos os 6 potes com 3 pessoas cada
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
