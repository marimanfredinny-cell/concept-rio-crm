import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import type { UserRole } from '@/types'

const ROLE_MAP: Record<string, UserRole> = {
  'gestora@conceptrio.com.br': 'gestora',
  'jean@conceptrio.com.br': 'corretor',
  'luiz@conceptrio.com.br': 'corretor',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userEmail = user.email ?? ''
  const role: UserRole = (user.user_metadata?.role as UserRole) ?? ROLE_MAP[userEmail] ?? 'corretor'
  const nome = user.user_metadata?.nome ?? user.email?.split('@')[0] ?? 'Usuário'

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <Sidebar userRole={role} userName={nome} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
