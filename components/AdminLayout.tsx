'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  History,
  UserCheck,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/rodada',    label: 'Rodadas',   icon: CalendarDays },
  { href: '/admin/jogadores', label: 'Jogadores', icon: Users },
  { href: '/admin/historico', label: 'Histórico', icon: History },
  { href: '/admin/presenca',  label: 'Presença',  icon: UserCheck },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card fixed h-screen z-30">
        <div className="px-4 py-5 border-b border-border">
          <p className="text-sm font-bold">Baba Lets</p>
          <p className="text-xs text-muted-foreground">Painel admin</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = isActive(item.href, item.exact ?? false)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Voltar ao app */}
        <div className="p-2 border-t border-border">
          <Link
            href="/painel"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 md:ml-56 pb-nav md:pb-0 min-h-screen">
        {children}
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 nav-safe-pb">
        <div className="flex">
          {/* Voltar ao app */}
          <Link
            href="/painel"
            className="flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] px-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar ao app"
          >
            <ChevronLeft className="w-[22px] h-[22px]" />
            <span className="text-[9px] font-medium leading-tight">Início</span>
          </Link>

          {/* Separador vertical */}
          <div className="w-px bg-border my-3" />

          {NAV.map(item => {
            const active = isActive(item.href, item.exact ?? false)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="w-[20px] h-[20px]" />
                <span className="text-[8px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
