'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GitMerge,
  Building2,
  CalendarClock,
  BarChart2,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['corretor', 'gestora', 'admin'] },
  { href: '/leads', label: 'Leads', icon: Users, roles: ['corretor', 'gestora', 'admin'] },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge, roles: ['corretor', 'gestora', 'admin'] },
  { href: '/imoveis', label: 'Imóveis', icon: Building2, roles: ['corretor', 'gestora', 'admin'] },
  { href: '/atendimentos', label: 'Atendimentos', icon: CalendarClock, roles: ['corretor', 'gestora', 'admin'] },
  { href: '/trafego', label: 'Tráfego', icon: TrendingUp, roles: ['gestora', 'admin'] },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart2, roles: ['gestora', 'admin'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
] as const

interface SidebarProps {
  userRole: UserRole
  userName: string
}

export default function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = navItems.filter(item =>
    (item.roles as readonly string[]).includes(userRole)
  )

  return (
    <aside className="w-56 min-h-screen bg-[#111] border-r border-white/[0.06] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#c8a96e] rounded-sm flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-xs">C</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Concept Rio</p>
            <p className="text-white/30 text-[10px] mt-0.5">CRM Imobiliário</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive
                  ? 'bg-[#c8a96e]/10 text-[#c8a96e]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-4">
        <div className="px-3 py-2 mb-1">
          <p className="text-white/70 text-xs font-medium truncate">{userName}</p>
          <p className="text-white/25 text-[10px] capitalize">{userRole}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
