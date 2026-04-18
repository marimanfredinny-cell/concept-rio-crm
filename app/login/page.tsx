'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#c8a96e] rounded-sm flex items-center justify-center">
              <span className="text-black font-bold text-sm">C</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-wide">Concept Rio</span>
          </div>
          <p className="text-white/30 text-sm">CRM Imobiliário</p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-8">
          <h1 className="text-white font-semibold text-lg mb-6">Entrar</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c8a96e] hover:bg-[#dfc28e] text-black font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Concept Rio Imóveis © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
