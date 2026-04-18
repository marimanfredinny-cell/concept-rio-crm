'use client'

import { useEffect, useState, useCallback } from 'react'
import { CalendarClock, Search, MessageSquare, Phone, Mail, MapPin, FileText, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Atendimento } from '@/types'
import { formatDate } from '@/types'

const TIPO_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  ligacao: Phone,
  email: Mail,
  visita: MapPin,
  nota: FileText,
}

const TIPO_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  ligacao: 'Ligação',
  email: 'E-mail',
  visita: 'Visita',
  nota: 'Nota',
}

const TIPO_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  ligacao: '#60a5fa',
  email: '#a78bfa',
  visita: '#f59e0b',
  nota: '#6b7280',
}

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('atendimentos')
      .select('*')
      .order('data', { ascending: false })
    setAtendimentos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleMarkDone = async (id: string) => {
    const sb = createClient()
    await sb.from('atendimentos').update({ status: 'realizado' }).eq('id', id)
    load()
  }

  const filtered = atendimentos.filter(a => {
    const s = search.toLowerCase()
    const matchSearch = !s || (a.lead_nome ?? '').toLowerCase().includes(s) || (a.descricao ?? '').toLowerCase().includes(s)
    const matchTipo = filterTipo === 'todos' || a.tipo === filterTipo
    const matchStatus = filterStatus === 'todos' || a.status === filterStatus
    return matchSearch && matchTipo && matchStatus
  })

  const agendados = filtered.filter(a => a.status === 'agendado')
  const realizados = filtered.filter(a => a.status !== 'agendado')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Atendimentos</h1>
          <p className="text-white/30 text-sm mt-1">{atendimentos.length} registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-white/30" />
          <input
            type="text"
            placeholder="Buscar lead ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none flex-1"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 text-white/60 text-sm focus:outline-none"
        >
          <option value="todos">Todos os Tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 text-white/60 text-sm focus:outline-none"
        >
          <option value="todos">Todos os Status</option>
          <option value="agendado">Agendado</option>
          <option value="realizado">Realizado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Agendados */}
          {agendados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock size={14} className="text-[#f59e0b]" />
                <h2 className="text-white/50 text-xs tracking-widest uppercase">Agendados ({agendados.length})</h2>
              </div>
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/25 text-[11px] uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="text-left px-5 py-3">Lead</th>
                      <th className="text-left px-5 py-3">Tipo</th>
                      <th className="text-left px-5 py-3">Data</th>
                      <th className="text-left px-5 py-3">Descrição</th>
                      <th className="text-left px-5 py-3">Corretor</th>
                      <th className="text-right px-5 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {agendados.map(a => {
                      const Icon = TIPO_ICONS[a.tipo] ?? FileText
                      const color = TIPO_COLORS[a.tipo] ?? '#6b7280'
                      return (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 text-white/70 font-medium">{a.lead_nome ?? '—'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color }} />
                              <span className="text-white/50 text-xs">{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[#f59e0b] text-xs font-medium">{formatDate(a.data)}</td>
                          <td className="px-5 py-3.5 text-white/40 text-xs max-w-xs truncate">{a.descricao || '—'}</td>
                          <td className="px-5 py-3.5 text-white/40 text-xs">{a.corretor ?? '—'}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleMarkDone(a.id)}
                              className="flex items-center gap-1 ml-auto text-xs text-green-400/60 hover:text-green-400 transition-colors"
                            >
                              <CheckCircle size={12} />
                              Marcar feito
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div>
            <h2 className="text-white/50 text-xs tracking-widest uppercase mb-3">
              Histórico ({realizados.length})
            </h2>
            {realizados.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl flex items-center justify-center h-24 text-white/20 text-sm">
                Nenhum atendimento realizado
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/25 text-[11px] uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="text-left px-5 py-3">Lead</th>
                      <th className="text-left px-5 py-3">Tipo</th>
                      <th className="text-left px-5 py-3">Data</th>
                      <th className="text-left px-5 py-3">Descrição</th>
                      <th className="text-left px-5 py-3">Corretor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {realizados.slice(0, 50).map(a => {
                      const Icon = TIPO_ICONS[a.tipo] ?? FileText
                      const color = TIPO_COLORS[a.tipo] ?? '#6b7280'
                      return (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 text-white/70">{a.lead_nome ?? '—'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color }} />
                              <span className="text-white/50 text-xs">{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-white/30 text-xs">{formatDate(a.data)}</td>
                          <td className="px-5 py-3.5 text-white/40 text-xs max-w-xs truncate">{a.descricao || '—'}</td>
                          <td className="px-5 py-3.5 text-white/40 text-xs">{a.corretor ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
