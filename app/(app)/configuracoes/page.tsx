'use client'

import { useState } from 'react'
import { Settings, Key, Users, Building2, RefreshCw } from 'lucide-react'

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<'integracoes' | 'usuarios'>('integracoes')
  const [syncingLeads, setSyncingLeads] = useState(false)
  const [syncingImoveis, setSyncingImoveis] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSync(endpoint: string, label: string, setter: (v: boolean) => void) {
    setter(true)
    setSyncMsg(null)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg({ ok: false, text: `${label}: ${data.error ?? 'Erro desconhecido'}` })
      } else {
        const detail = label === 'Leads'
          ? `${data.inserted ?? 0} novos, ${data.updated ?? 0} atualizados (total ${data.total ?? 0})`
          : `${data.upserted ?? 0} imóveis sincronizados (total ${data.total ?? 0})`
        setSyncMsg({ ok: true, text: `${label} sincronizados: ${detail}` })
      }
    } catch {
      setSyncMsg({ ok: false, text: `${label}: erro de conexão com a API do Ego` })
    } finally {
      setter(false)
      setTimeout(() => setSyncMsg(null), 8000)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-semibold">Configurações</h1>
        <p className="text-white/30 text-sm mt-1">Integrações e gestão de usuários</p>
      </div>

      <div className="flex gap-1 bg-[#1a1a1a] border border-white/[0.06] rounded-lg p-1 mb-6 w-fit">
        {([['integracoes', 'Integrações'], ['usuarios', 'Usuários']] as const).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm transition-all ${
              tab === k ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {tab === 'integracoes' && (
        <div className="space-y-4">
          {/* Ego Real Estate */}
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={18} className="text-[#c8a96e]" />
              <h2 className="text-white font-medium">Ego Real Estate</h2>
            </div>
            <p className="text-white/40 text-sm mb-4">
              Sincronize imóveis e leads do Ego Real Estate (onde o site está hospedado) com este CRM.
            </p>

            {syncMsg && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                syncMsg.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {syncMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => handleSync('/api/ego/leads/sync', 'Leads', setSyncingLeads)}
                disabled={syncingLeads || syncingImoveis}
                className="flex items-center justify-center gap-2 bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 border border-[#c8a96e]/20 text-[#c8a96e] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={syncingLeads ? 'animate-spin' : ''} />
                {syncingLeads ? 'Sincronizando…' : 'Sincronizar Leads'}
              </button>
              <button
                onClick={() => handleSync('/api/ego/sync', 'Imóveis', setSyncingImoveis)}
                disabled={syncingLeads || syncingImoveis}
                className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={syncingImoveis ? 'animate-spin' : ''} />
                {syncingImoveis ? 'Sincronizando…' : 'Sincronizar Imóveis'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">
                  EGO_API_KEY
                </label>
                <input
                  type="password"
                  placeholder="Sua chave de API do Ego RE"
                  readOnly
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white/30 text-sm focus:outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">
                  EGO_EMPRESA_ID
                </label>
                <input
                  type="text"
                  placeholder="ID da empresa no Ego RE"
                  readOnly
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white/30 text-sm focus:outline-none cursor-not-allowed"
                />
              </div>
              <p className="text-white/25 text-xs">
                Configure essas variáveis no arquivo <code className="bg-white/10 px-1 rounded">.env.local</code> do servidor.
                Obtenha suas credenciais no painel do Ego Real Estate → Configurações → API.
              </p>
            </div>
          </div>

          {/* Google Ads */}
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key size={18} className="text-[#4285F4]" />
              <h2 className="text-white font-medium">Google Ads</h2>
            </div>
            <p className="text-white/40 text-sm mb-3">
              Configure a integração com o Google Ads para monitorar campanhas.
            </p>
            <div className="bg-[#111] border border-white/[0.06] rounded-lg p-4 text-xs text-white/40 space-y-1">
              <p><code className="text-[#4285F4]">GOOGLE_ADS_DEVELOPER_TOKEN</code> — Token de desenvolvedor da API</p>
              <p><code className="text-[#4285F4]">GOOGLE_ADS_CLIENT_ID</code> — ID do cliente OAuth</p>
              <p><code className="text-[#4285F4]">GOOGLE_ADS_CLIENT_SECRET</code> — Segredo do cliente OAuth</p>
              <p><code className="text-[#4285F4]">GOOGLE_ADS_REFRESH_TOKEN</code> — Token de renovação OAuth</p>
              <p><code className="text-[#4285F4]">GOOGLE_ADS_CUSTOMER_ID</code> — ID da conta do Google Ads</p>
            </div>
          </div>

          {/* Meta Ads */}
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key size={18} className="text-[#1877F2]" />
              <h2 className="text-white font-medium">Meta Ads (Facebook/Instagram)</h2>
            </div>
            <p className="text-white/40 text-sm mb-3">
              Configure a integração com o Meta Business Manager.
            </p>
            <div className="bg-[#111] border border-white/[0.06] rounded-lg p-4 text-xs text-white/40 space-y-1">
              <p><code className="text-[#1877F2]">META_ACCESS_TOKEN</code> — Token de acesso do Meta for Developers</p>
              <p><code className="text-[#1877F2]">META_AD_ACCOUNT_ID</code> — ID da conta de anúncios (sem o prefixo act_)</p>
            </div>
            <p className="text-white/25 text-xs mt-3">
              Gere o token em: Meta for Developers → Seus Apps → Ferramentas → Explorador de API do Graph
            </p>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users size={18} className="text-[#c8a96e]" />
            <h2 className="text-white font-medium">Usuários do Sistema</h2>
          </div>
          <p className="text-white/40 text-sm mb-6">
            Os usuários são gerenciados diretamente no painel do Supabase.
            Acesse Authentication → Users para adicionar, remover ou redefinir senhas.
          </p>

          <div className="space-y-3">
            {[
              { nome: 'Jean', email: 'jean@conceptrio.com.br', role: 'Corretor' },
              { nome: 'Luiz', email: 'luiz@conceptrio.com.br', role: 'Corretor' },
              { nome: 'Gestora', email: 'gestora@conceptrio.com.br', role: 'Gestora de Tráfego' },
            ].map(u => (
              <div key={u.email} className="flex items-center justify-between p-3 bg-[#111] border border-white/[0.06] rounded-lg">
                <div>
                  <p className="text-white/70 text-sm font-medium">{u.nome}</p>
                  <p className="text-white/30 text-xs">{u.email}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#c8a96e]/10 text-[#c8a96e] font-medium">
                  {u.role}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-lg">
            <p className="text-[#c8a96e] text-xs font-medium mb-1">Para adicionar usuários:</p>
            <p className="text-white/40 text-xs">
              1. Acesse seu projeto no Supabase → Authentication → Users<br />
              2. Clique em &quot;Invite user&quot; ou &quot;Add user&quot;<br />
              3. Preencha o email e senha do novo usuário<br />
              4. O papel (role) é definido nos metadados do usuário: &ldquo;role&rdquo;: &ldquo;gestora&rdquo; ou &ldquo;corretor&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
