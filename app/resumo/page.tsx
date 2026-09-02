'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface VoteEntry {
  voted_for_id: number
  voted_for_name: string
  pote: number
}

const POTE_COLORS: Record<number, { badge: string; bg: string; border: string }> = {
  1: { badge: 'bg-green-600', bg: 'bg-green-50', border: 'border-green-300' },
  2: { badge: 'bg-green-700', bg: 'bg-green-50', border: 'border-green-400' },
  3: { badge: 'bg-green-800', bg: 'bg-green-50', border: 'border-green-500' },
  4: { badge: 'bg-gray-600',  bg: 'bg-gray-50',  border: 'border-gray-300'  },
  5: { badge: 'bg-gray-700',  bg: 'bg-gray-50',  border: 'border-gray-400'  },
  6: { badge: 'bg-gray-800',  bg: 'bg-gray-50',  border: 'border-gray-500'  },
}

function ResumoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const readonly = searchParams.get('readonly') === '1'

  const [voterName, setVoterName] = useState('')
  const [votes, setVotes] = useState<VoteEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const name = sessionStorage.getItem('baba_voter_name')
    const votesRaw = sessionStorage.getItem('baba_votes')
    if (!name) { router.replace('/'); return }
    setVoterName(name)
    if (votesRaw) setVotes(JSON.parse(votesRaw))
    if (readonly) setSubmitted(true)
  }, [router, readonly])

  const poteMap: Record<number, VoteEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const v of votes) {
    if (poteMap[v.pote]) poteMap[v.pote].push(v)
  }

  async function handleConfirm() {
    const voterId = sessionStorage.getItem('baba_voter_id')
    if (!voterId) { router.replace('/'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/votar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter_id: Number(voterId),
        votes: votes.map(v => ({ voted_for_id: v.voted_for_id, pote: v.pote })),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao salvar votos')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted && !readonly) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Votos registrados!</h1>
          <p className="text-gray-500 mb-6">Obrigado, {voterName}! Seus potes foram salvos com sucesso.</p>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            {[1, 2, 3, 4, 5, 6].map(pote => {
              const c = POTE_COLORS[pote]
              return (
                <div key={pote} className={`rounded-xl ${c.bg} border ${c.border} px-3 py-2`}>
                  <span className={`${c.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2`}>
                    Pote {pote}
                  </span>
                  <span className="text-sm text-gray-700">
                    {poteMap[pote].map(v => v.voted_for_name).join(', ')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            {readonly ? 'Seus votos' : 'Confirmar votos'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {readonly ? `${voterName}, você já votou!` : `${voterName}, confira seus potes antes de confirmar`}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map(pote => {
          const c = POTE_COLORS[pote]
          const entries = poteMap[pote]
          return (
            <div key={pote} className={`rounded-xl border-2 ${c.bg} ${c.border} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`${c.badge} text-white text-sm font-bold px-3 py-1 rounded-full`}>
                  Pote {pote}
                </span>
              </div>
              <div className="space-y-2">
                {entries.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum alocado</p>
                ) : (
                  entries.map((v, i) => (
                    <div key={v.voted_for_id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{v.voted_for_name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!readonly && (
          <div className="space-y-3 pb-8">
            <button
              onClick={handleConfirm}
              disabled={submitting || votes.length < 18}
              className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-lg rounded-xl transition-colors"
            >
              {submitting ? 'Confirmando...' : 'Confirmar e Enviar Votos'}
            </button>
            <button
              onClick={() => router.push('/votar')}
              className="w-full h-11 border-2 border-gray-300 text-gray-600 hover:border-gray-400 font-medium rounded-xl transition-colors"
            >
              Voltar e Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumoPage() {
  return (
    <Suspense>
      <ResumoContent />
    </Suspense>
  )
}
