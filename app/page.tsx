'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface Player {
  id: number
  name: string
}

type LoginStep = 'select' | 'setup_pin' | 'enter_pin'

export default function LoginPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [step, setStep] = useState<LoginStep>('select')
  const [pin, setPin] = useState(['', '', '', ''])
  const [pinConfirm, setPinConfirm] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const pinConfirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoadingList(false) })
  }, [])

  function handlePinInput(
    value: string,
    index: number,
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement>[]
  ) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...arr]
    next[index] = digit
    setArr(next)
    if (digit && index < 3) refs[index + 1].current?.focus()
  }

  function handlePinKeyDown(
    e: React.KeyboardEvent,
    index: number,
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement>[]
  ) {
    if (e.key === 'Backspace' && !arr[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  async function handleSelectPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: Number(selectedId) }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'Erro'); return }

    if (data.needs_pin_setup) {
      setStep('setup_pin')
      setTimeout(() => pinRefs[0].current?.focus(), 100)
    } else if (data.needs_pin) {
      setStep('enter_pin')
      setTimeout(() => pinRefs[0].current?.focus(), 100)
    } else {
      // Sem PIN configurado no sistema (fallback legacy)
      sessionStorage.setItem('baba_voter_id', String(data.id))
      sessionStorage.setItem('baba_voter_name', data.name)
      router.push('/painel')
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pinStr = pin.join('')
    if (pinStr.length !== 4) { setError('Digite os 4 dígitos do PIN'); return }

    if (step === 'setup_pin') {
      const confirmStr = pinConfirm.join('')
      if (pinStr !== confirmStr) { setError('Os PINs não coincidem'); return }
    }

    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: Number(selectedId), pin: pinStr }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'PIN incorreto')
      setPin(['', '', '', ''])
      setPinConfirm(['', '', '', ''])
      setTimeout(() => pinRefs[0].current?.focus(), 50)
      return
    }

    sessionStorage.setItem('baba_voter_id', String(data.id))
    sessionStorage.setItem('baba_voter_name', data.name)
    router.push('/painel')
  }

  const selectedName = players.find(p => String(p.id) === selectedId)?.name

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Image src="/logo.png" alt="Let's Baba!" width={140} height={140} priority />
          </div>
          <p className="text-muted-foreground text-sm">Avalie os jogadores e monte os times!</p>
        </div>

        {step === 'select' && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSelectPlayer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Quem é você?</Label>
                  {loadingList ? (
                    <div className="h-10 bg-muted rounded-md animate-pulse" />
                  ) : (
                    <select
                      value={selectedId}
                      onChange={e => setSelectedId(e.target.value)}
                      className="w-full h-10 px-3 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Selecione seu nome...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || !selectedId} size="lg">
                  {loading ? 'Verificando...' : 'Continuar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {(step === 'enter_pin' || step === 'setup_pin') && (
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {step === 'setup_pin' ? 'Primeiro acesso' : 'Bem-vindo de volta'}
                </p>
                <p className="font-semibold text-foreground">{selectedName}</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-center block">
                    {step === 'setup_pin' ? 'Crie seu PIN de 4 dígitos' : 'Digite seu PIN'}
                  </Label>
                  <div className="flex justify-center gap-3">
                    {pin.map((d, i) => (
                      <input
                        key={i}
                        ref={pinRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                        onKeyDown={e => handlePinKeyDown(e, i, pin, setPin, pinRefs)}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-input rounded-lg focus:outline-none focus:border-primary bg-background transition-colors"
                      />
                    ))}
                  </div>
                </div>

                {step === 'setup_pin' && (
                  <div className="space-y-2">
                    <Label className="text-center block">Confirme seu PIN</Label>
                    <div className="flex justify-center gap-3">
                      {pinConfirm.map((d, i) => (
                        <input
                          key={i}
                          ref={pinConfirmRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={e => handlePinInput(e.target.value, i, pinConfirm, setPinConfirm, pinConfirmRefs)}
                          onKeyDown={e => handlePinKeyDown(e, i, pinConfirm, setPinConfirm, pinConfirmRefs)}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 border-input rounded-lg focus:outline-none focus:border-primary bg-background transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-destructive text-sm text-center">{error}</p>}

                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading ? 'Entrando...' : step === 'setup_pin' ? 'Criar PIN e entrar' : 'Entrar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setStep('select'); setPin(['','','','']); setPinConfirm(['','','','']); setError('') }}
                  >
                    ← Voltar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <a href="/admin" className="text-xs text-muted-foreground hover:text-foreground">Admin</a>
        </div>
      </div>
    </div>
  )
}
