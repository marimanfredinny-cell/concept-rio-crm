'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/types'
import { LEAD_STATUS_CONFIG, CORRETORES, formatCurrency } from '@/types'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RelatoriosPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('leads').select('*').order('created_at', { ascending: true })
    setLeads(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cutoff = subDays(new Date(), period)
  const filtered = leads.filter(l => new Date(l.created_at) >= cutoff)

  // Leads per day
  const days = eachDayOfInterval({ start: cutoff, end: new Date() })
  const dailyData = days.map(day => {
    const key = format(day, 'dd/MM')
    const count = filtered.filter(l => format(new Date(l.created_at), 'dd/MM') === key).length
    const fechados = filtered.filter(l =>
      l.status === 'fechado' && format(new Date(l.created_at), 'dd/MM') === key
    ).length
    return { dia: key, leads: count, fechados }
  })

  // By corretor
  const corretorData = CORRETORES.map(nome => {
    const meus = filtered.filter(l => l.corretor === nome)
    return {
      nome,
      total: meus.length,
      fechados: meus.filter(l => l.status === 'fechado').length,
      perdidos: meus.filter(l => l.status === 'perdido').length,
    }
  })

  // By origem
  const origemData = filtered.reduce((acc, l) => {
    const k = l.origem ?? 'Outros'
    if (!acc[k]) acc[k] = { name: k, total: 0, fechados: 0 }
    acc[k].total++
    if (l.status === 'fechado') acc[k].fechados++
    return acc
  }, {} as Record<string, { name: string; total: number; fechados: number }>)

  const origemArr = Object.values(origemData).sort((a, b) => b.total - a.total).slice(0, 8)

  // Summary stats
  const totalPeriod = filtered.length
  const fechadosPeriod = filtered.filter(l => l.status === 'fechado').length
  const txConversao = totalPeriod > 0 ? ((fechadosPeriod / totalPeriod) * 100).toFixed(1) : '0'
  const ticketMedio = fechadosPeriod > 0
    ? filtered.filter(l => l.status === 'fechado' && l.orcamento).reduce((s, l) => s + (l.orcamento ?? 0), 0) / fechadosPeriod
    : 0

  const exportCsv = () => {
    const header = ['Nome', 'Telefone', 'Email', 'Origem', 'Corretor', 'Status', 'Orçamento', 'Bairro', 'UTM Campaign', 'Data Entrada'].join(';')
    const rows = filtered.map(l => [
      l.nome, l.telefone, l.email ?? '', l.origem ?? '', l.corretor, l.status,
      l.orcamento ?? '', l.bairro_interesse ?? '', l.utm_campaign ?? '', l.data_entrada,
    ].join(';'))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `leads-concept-rio-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Relatórios</h1>
          <p className="text-white/30 text-sm mt-1">Análise de desempenho</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-[#1a1a1a] border border-white/[0.06] rounded-lg p-1">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === d ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.06] text-white/50 hover:text-white px-3 py-2 rounded-lg text-sm transition-all"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Leads no Período', value: totalPeriod },
          { label: 'Fechamentos', value: fechadosPeriod },
          { label: 'Taxa de Conversão', value: `${txConversao}%` },
          { label: 'Ticket Médio', value: formatCurrency(ticketMedio) },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
            <p className="text-white/40 text-xs tracking-wide uppercase mb-2">{s.label}</p>
            <p className="text-white text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Daily leads chart */}
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Leads por Dia</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dia" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Line type="monotone" dataKey="leads" stroke="#c8a96e" strokeWidth={2} dot={false} name="Leads" />
                <Line type="monotone" dataKey="fechados" stroke="#34d399" strokeWidth={2} dot={false} name="Fechados" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By corretor */}
            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Por Corretor</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={corretorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="nome" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                  <Bar dataKey="total" fill="#c8a96e" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="fechados" fill="#34d399" radius={[4, 4, 0, 0]} name="Fechados" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By origem */}
            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Por Origem</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={origemArr} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" fill="#c8a96e" radius={[0, 4, 4, 0]} name="Total" />
                  <Bar dataKey="fechados" fill="#34d399" radius={[0, 4, 4, 0]} name="Fechados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">Status dos Leads no Período</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(LEAD_STATUS_CONFIG).map(([status, cfg]) => {
                const count = filtered.filter(l => l.status === status).length
                const pct = totalPeriod > 0 ? ((count / totalPeriod) * 100).toFixed(0) : '0'
                return (
                  <div key={status} className="flex flex-col gap-1 p-3 rounded-lg" style={{ background: cfg.bg }}>
                    <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-white text-xl font-semibold">{count}</span>
                    <span className="text-white/30 text-xs">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
