'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, MousePointer, Eye, DollarSign, Target, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CampanhaAds } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

type LeadPartial = {
  origem?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  created_at: string
}

function StatCard({ label, value, sub, icon: Icon, color = '#c8a96e' }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-white/40 text-xs tracking-wide uppercase">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-white text-2xl font-semibold">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: '#4285F4',
  meta_ads: '#1877F2',
}

const PIE_COLORS = ['#c8a96e', '#4285F4', '#1877F2', '#34d399', '#f87171', '#a78bfa']

export default function TrafegoPage() {
  const [campanhas, setCampanhas] = useState<CampanhaAds[]>([])
  const [leads, setLeads] = useState<LeadPartial[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingGoogle, setSyncingGoogle] = useState(false)
  const [syncingMeta, setSyncingMeta] = useState(false)
  const [msg, setMsg] = useState('')
  const [filterPlataforma, setFilterPlataforma] = useState<'todos' | 'google_ads' | 'meta_ads'>('todos')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const [{ data: c }, { data: l }] = await Promise.all([
      sb.from('campanhas_ads').select('*').order('gasto', { ascending: false }),
      sb.from('leads').select('origem, utm_source, utm_medium, utm_campaign, created_at'),
    ])
    setCampanhas(c ?? [])
    setLeads(l ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const syncGoogle = async () => {
    setSyncingGoogle(true)
    setMsg('')
    const res = await fetch('/api/ads/google', { method: 'POST' })
    const json = await res.json()
    setMsg(json.error ? `Google Ads: ${json.error}` : `✓ Google Ads: ${json.synced} campanhas`)
    setSyncingGoogle(false)
    load()
  }

  const syncMeta = async () => {
    setSyncingMeta(true)
    setMsg('')
    const res = await fetch('/api/ads/meta', { method: 'POST' })
    const json = await res.json()
    setMsg(json.error ? `Meta Ads: ${json.error}` : `✓ Meta Ads: ${json.synced} campanhas`)
    setSyncingMeta(false)
    load()
  }

  const filtered = campanhas.filter(c => filterPlataforma === 'todos' || c.plataforma === filterPlataforma)

  const totalGasto = filtered.reduce((s, c) => s + (c.gasto ?? 0), 0)
  const totalImpr = filtered.reduce((s, c) => s + (c.impressoes ?? 0), 0)
  const totalCliques = filtered.reduce((s, c) => s + (c.cliques ?? 0), 0)
  const totalConversoes = filtered.reduce((s, c) => s + (c.conversoes ?? 0), 0)
  const mediaCtr = filtered.length > 0
    ? (filtered.reduce((s, c) => s + (c.ctr ?? 0), 0) / filtered.length).toFixed(2)
    : '0.00'
  const cpl = totalConversoes > 0 ? (totalGasto / totalConversoes).toFixed(2) : '—'

  // Leads by origin
  const originData = leads.reduce((acc, l) => {
    const k = l.origem ?? 'Outros'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(originData).map(([name, value]) => ({ name, value }))

  // Leads per campaign (UTM)
  const campaignLeads = leads.reduce((acc, l) => {
    const k = l.utm_campaign
    if (k) acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const barData = Object.entries(campaignLeads)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, leads]) => ({ name, leads }))

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Tráfego Pago</h1>
          <p className="text-white/30 text-sm mt-1">Google Ads & Meta Ads — últimos 30 dias</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncGoogle}
            disabled={syncingGoogle}
            className="flex items-center gap-2 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/30 text-[#4285F4] px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={syncingGoogle ? 'animate-spin' : ''} />
            Sync Google
          </button>
          <button
            onClick={syncMeta}
            disabled={syncingMeta}
            className="flex items-center gap-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={syncingMeta ? 'animate-spin' : ''} />
            Sync Meta
          </button>
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          msg.includes('Erro') || msg.includes('error') || msg.includes('não configurad')
            ? 'bg-red-400/10 border-red-400/20 text-red-400'
            : 'bg-green-400/10 border-green-400/20 text-green-400'
        }`}>
          {msg}
        </div>
      )}

      {/* Config info */}
      {campanhas.length === 0 && (
        <div className="mb-6 bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-[#c8a96e] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#c8a96e] text-sm font-medium">Como configurar o Tráfego Pago</p>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Adicione as variáveis no painel da Vercel em <strong className="text-white/60">Settings → Environment Variables</strong> e clique em Sync para importar.
              <br /><br />
              <strong className="text-white/60">Meta Ads:</strong>{' '}
              <code className="bg-white/10 px-1 rounded">META_ACCESS_TOKEN</code> e{' '}
              <code className="bg-white/10 px-1 rounded">META_AD_ACCOUNT_ID</code>
              <br />
              <strong className="text-white/60">Google Ads:</strong>{' '}
              <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code>,{' '}
              <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_CLIENT_ID</code>,{' '}
              <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_CLIENT_SECRET</code>,{' '}
              <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_REFRESH_TOKEN</code>,{' '}
              <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_CUSTOMER_ID</code>
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['todos', 'google_ads', 'meta_ads'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilterPlataforma(p)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
              filterPlataforma === p
                ? 'bg-white/10 border-white/20 text-white'
                : 'border-white/[0.06] text-white/40 hover:text-white/60'
            }`}
          >
            {p === 'todos' ? 'Todos' : p === 'google_ads' ? 'Google Ads' : 'Meta Ads'}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Investido" value={`R$ ${totalGasto.toFixed(2)}`} color="#c8a96e" />
        <StatCard icon={Eye} label="Impressões" value={totalImpr.toLocaleString('pt-BR')} color="#60a5fa" />
        <StatCard icon={MousePointer} label="Cliques" value={totalCliques.toLocaleString('pt-BR')} color="#34d399" />
        <StatCard icon={Target} label="Conversões" value={totalConversoes} sub="leads gerados" color="#a78bfa" />
        <StatCard icon={TrendingUp} label="CTR Médio" value={`${mediaCtr}%`} color="#f59e0b" />
        <StatCard icon={DollarSign} label="CPL" value={cpl === '—' ? '—' : `R$ ${cpl}`} sub="custo por lead" color="#fb923c" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leads por origem */}
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Leads por Origem</h2>
          {pieData.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leads por campanha UTM */}
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Leads por Campanha (UTM)</h2>
          {barData.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-8">Sem parâmetros UTM registrados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="leads" fill="#c8a96e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Campaigns Table */}
      {filtered.length > 0 && (
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-white/60 text-xs tracking-widest uppercase">Campanhas Ativas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-[11px] uppercase tracking-wider border-b border-white/[0.05]">
                  <th className="text-left px-5 py-3">Campanha</th>
                  <th className="text-left px-5 py-3">Plataforma</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Gasto</th>
                  <th className="text-right px-5 py-3">Impressões</th>
                  <th className="text-right px-5 py-3">Cliques</th>
                  <th className="text-right px-5 py-3">CTR</th>
                  <th className="text-right px-5 py-3">Conversões</th>
                  <th className="text-right px-5 py-3">CPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(c => {
                  const color = PLATFORM_COLORS[c.plataforma] ?? '#c8a96e'
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white/70 font-medium max-w-48 truncate">{c.nome}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ color, background: `${color}18` }}
                        >
                          {c.plataforma === 'google_ads' ? 'Google' : 'Meta'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] ${c.status === 'enabled' || c.status === 'active' ? 'text-green-400' : 'text-white/30'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/60 text-xs">
                        R$ {(c.gasto ?? 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/40 text-xs">
                        {(c.impressoes ?? 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/40 text-xs">
                        {(c.cliques ?? 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/40 text-xs">
                        {((c.ctr ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#c8a96e] text-xs font-medium">
                        {c.conversoes ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/40 text-xs">
                        R$ {(c.cpc ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
