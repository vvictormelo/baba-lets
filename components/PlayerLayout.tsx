'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Home, Vote, Trophy, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/painel',    label: 'Início',    icon: Home,      exact: true },
  { href: '/votar',     label: 'Avaliar',   icon: Vote },
  { href: '/resultado', label: 'Resultado', icon: Trophy },
  { href: '/ranking',   label: 'Ranking',   icon: BarChart3 },
]

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [playerName, setPlayerName] = useState<string | null>(null)

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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/painel" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Let's Baba" width={100} height={34} className="h-8 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3">
            {playerName && (
              <span className="text-sm text-muted-foreground hidden sm:block border-r border-border pr-3">
                {playerName}
              </span>
            )}
            {playerName && (
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
