'use client'

import { useEffect, useState } from 'react'
import { Users, Building2, TrendingUp, CalendarCheck, RefreshCw, Flame, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Imovel, Atendimento } from '@/types'
import { LEAD_STATUS_CONFIG, formatCurrency, formatDate } from '@/types'

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = '#c8a96e',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-white/40 text-xs tracking-wide uppercase">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-white text-2xl font-semibold">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const sb = createClient()
    const [{ data: l }, { data: i }, { data: a }] = await Promise.all([
      sb.from('leads').select('*').order('created_at', { ascending: false }),
      sb.from('imoveis').select('*'),
      sb.from('atendimentos').select('*').eq('status', 'agendado').order('data'),
    ])
    setLeads(l ?? [])
    setImoveis(i ?? [])
    setAtendimentos(a ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalLeads = leads.length
  const leadsAtivos = leads.filter(l => !['fechado', 'perdido'].includes(l.status)).length
  const fechados = leads.filter(l => l.status === 'fechado').length
  const emNegociacao = leads.filter(l => ['proposta', 'negociacao', 'visita_realizada'].includes(l.status)).length
  const imoveisDisponiveis = imoveis.filter(i => i.status === 'disponivel').length
  const taxaConversao = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0

  const statusCount = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const leadsRecentes = leads.slice(0, 6)

  const origemCount = leads.reduce((acc, l) => {
    if (l.origem) acc[l.origem] = (acc[l.origem] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topOrigens = Object.entries(origemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">Visão geral do negócio</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Users} label="Total de Leads" value={totalLeads} sub={`${leadsAtivos} ativos`} />
        <MetricCard icon={Flame} label="Em Negociação" value={emNegociacao} color="#fb923c" />
        <MetricCard icon={CheckCircle} label="Fechados" value={fechados} sub={`${taxaConversao}% conversão`} color="#34d399" />
        <MetricCard icon={Building2} label="Imóveis" value={imoveisDisponiveis} sub="disponíveis" color="#60a5fa" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil por status */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Funil de Leads</h2>
          <div className="space-y-2">
            {Object.entries(LEAD_STATUS_CONFIG).map(([status, config]) => {
              const count = statusCount[status] || 0
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-white/40 text-xs w-36 truncate">{config.label}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: config.color }}
                    />
                  </div>
                  <span className="text-white/60 text-xs w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Origem dos Leads */}
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Origens</h2>
          {topOrigens.length === 0 ? (
            <p className="text-white/20 text-sm">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {topOrigens.map(([origem, count]) => (
                <div key={origem} className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">{origem}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1 rounded-full bg-[#c8a96e]/40"
                      style={{ width: `${Math.max(20, (count / totalLeads) * 80)}px` }}
                    />
                    <span className="text-white/40 text-xs">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leads Recentes */}
      <div className="mt-6 bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Leads Recentes</h2>
        {leadsRecentes.length === 0 ? (
          <p className="text-white/20 text-sm">Nenhum lead cadastrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-[11px] uppercase tracking-wider border-b border-white/[0.05]">
                  <th className="text-left pb-3 pr-4">Nome</th>
                  <th className="text-left pb-3 pr-4">Origem</th>
                  <th className="text-left pb-3 pr-4">Corretor</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leadsRecentes.map(lead => {
                  const cfg = LEAD_STATUS_CONFIG[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 text-white/80 font-medium">{lead.nome}</td>
                      <td className="py-3 pr-4 text-white/40">{lead.origem || '—'}</td>
                      <td className="py-3 pr-4 text-white/40">{lead.corretor}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ color: cfg?.color, background: cfg?.bg }}
                        >
                          {cfg?.label ?? lead.status}
                        </span>
                      </td>
                      <td className="py-3 text-white/30 text-xs">{formatDate(lead.data_entrada)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Próximos Atendimentos */}
      {atendimentos.length > 0 && (
        <div className="mt-6 bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck size={14} className="text-[#c8a96e]" />
            <h2 className="text-white/60 text-xs tracking-widest uppercase">Próximos Atendimentos</h2>
          </div>
          <div className="space-y-2">
            {atendimentos.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-white/70 text-sm">{a.lead_nome || a.lead_id}</span>
                <span className="text-[#c8a96e] text-xs">{formatDate(a.data)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
