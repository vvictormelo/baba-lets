'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  History,
  UserCheck,
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
        {/* Brand */}
        <div className="px-4 py-5 border-b border-border">
          <p className="text-sm font-bold text-foreground">Baba Lets</p>
          <p className="text-xs text-muted-foreground">Painel admin</p>
        </div>

        {/* Nav */}
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
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 safe-area-pb">
        <div className="flex">
          {NAV.map(item => {
            const active = isActive(item.href, item.exact ?? false)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
