'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Home, Vote, Trophy, BarChart3, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/painel',    label: 'Início',    icon: Home,       exact: true },
  { href: '/votar',     label: 'Avaliar',   icon: Vote },
  { href: '/resultado', label: 'Resultado', icon: Trophy },
  { href: '/ranking',   label: 'Ranking',   icon: BarChart3 },
]

const HOME = '/painel'

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [playerName, setPlayerName] = useState<string | null>(null)
  const isHome = pathname === HOME

  useEffect(() => {
    setPlayerName(sessionStorage.getItem('baba_voter_name'))
  }, [])

  function handleLogout() {
    sessionStorage.clear()
    router.replace('/')
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
          {/* Botão voltar (fora da home) */}
          {!isHome && (
            <button
              onClick={() => router.back()}
              className="touch-target flex items-center justify-center -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo */}
          <Link href={HOME} className="flex items-center flex-1">
            <Image src="/logo.png" alt="Let's Baba" width={88} height={30} className="h-7 w-auto" priority />
          </Link>

          {/* Nome + Sair */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {playerName && (
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[100px]">
                {playerName}
              </span>
            )}
            {playerName && (
              <button
                onClick={handleLogout}
                className="touch-target flex items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-nav">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20 nav-safe-pb">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="w-[22px] h-[22px]" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
