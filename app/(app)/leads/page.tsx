'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Filter, MessageSquare, Edit2, Trash2, ChevronDown, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LeadModal from '@/components/leads/LeadModal'
import AtendimentoModal from '@/components/leads/AtendimentoModal'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_CONFIG, CORRETORES, formatCurrency, formatDate } from '@/types'

const ROLE_MAP: Record<string, string> = {
  'gestora@conceptrio.com.br': 'gestora',
  'jean@conceptrio.com.br': 'corretor',
  'luiz@conceptrio.com.br': 'corretor',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterCorretor, setFilterCorretor] = useState<string>('todos')
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [atendimentoLead, setAtendimentoLead] = useState<Lead | null>(null)
  const [currentUser] = useState('Luiz')
  const [userRole, setUserRole] = useState<string>('corretor')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const [{ data }, { data: { user } }] = await Promise.all([
      sb.from('leads').select('*').order('created_at', { ascending: false }),
      sb.auth.getUser(),
    ])
    setLeads(data ?? [])
    if (user) {
      const role = (user.user_metadata?.role as string) ?? ROLE_MAP[user.email ?? ''] ?? 'corretor'
      setUserRole(role)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return
    const sb = createClient()
    const { error } = await sb.from('leads').delete().eq('id', id)
    if (error) {
      alert(`Erro ao excluir: ${error.message}`)
      return
    }
    await load()
  }

  const handleEgoSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/ego/leads/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg({ ok: false, text: data.error ?? 'Erro ao sincronizar' })
      } else if (data.total === 0) {
        setSyncMsg({ ok: true, text: 'Nenhum lead encontrado no Ego. Verifique as credenciais.' })
      } else {
        setSyncMsg({ ok: true, text: `Sync concluído: ${data.inserted} novos, ${data.updated} atualizados (total ${data.total})` })
        await load()
      }
    } catch {
      setSyncMsg({ ok: false, text: 'Erro de conexão com a API do Ego' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 6000)
    }
  }

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    const sb = createClient()
    const now = new Date().toISOString().split('T')[0]
    await sb.from('leads').update({ status, ultimo_contato: now }).eq('id', lead.id)
    await sb.from('historico_leads').insert({
      lead_id: lead.id,
      lead_nome: lead.nome,
      status_anterior: lead.status,
      status_novo: status,
      corretor: lead.corretor,
    })
    load()
  }

  const filtered = leads.filter(l => {
    const matchSearch =
      !search ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.telefone.includes(search) ||
      (l.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || l.status === filterStatus
    const matchCorretor = filterCorretor === 'todos' || l.corretor === filterCorretor
    return matchSearch && matchStatus && matchCorretor
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Leads</h1>
          <p className="text-white/30 text-sm mt-1">{filtered.length} leads encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEgoSync}
            disabled={syncing}
            title="Importar leads do Ego Real Estate"
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white/80 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sync Ego'}
          </button>
          <button
            onClick={() => { setEditLead(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          syncMsg.ok
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {syncMsg.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-white/30" />
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none flex-1"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 text-white/60 text-sm focus:outline-none focus:border-white/20"
        >
          <option value="todos">Todos os Status</option>
          {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterCorretor}
          onChange={e => setFilterCorretor(e.target.value)}
          className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 text-white/60 text-sm focus:outline-none focus:border-white/20"
        >
          <option value="todos">Todos os Corretores</option>
          {CORRETORES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/20">
            <p className="text-sm">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/25 text-[11px] uppercase tracking-wider border-b border-white/[0.05]">
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Contato</th>
                  <th className="text-left px-5 py-3">Origem</th>
                  <th className="text-left px-5 py-3">Corretor</th>
                  <th className="text-left px-5 py-3">Orçamento</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Último Contato</th>
                  <th className="text-right px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(lead => {
                  const cfg = LEAD_STATUS_CONFIG[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="text-white/80 font-medium">{lead.nome}</p>
                        {lead.bairro_interesse && (
                          <p className="text-white/25 text-xs">{lead.bairro_interesse}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-white/50 text-xs">{lead.telefone}</p>
                        {lead.email && <p className="text-white/30 text-xs">{lead.email}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">{lead.origem || '—'}</td>
                      <td className="px-5 py-3.5 text-white/50 text-xs">{lead.corretor}</td>
                      <td className="px-5 py-3.5 text-white/50 text-xs">{formatCurrency(lead.orcamento)}</td>
                      <td className="px-5 py-3.5">
                        <div className="relative group/status">
                          <span
                            className="text-[11px] px-2.5 py-1 rounded-full font-medium cursor-pointer"
                            style={{ color: cfg?.color, background: cfg?.bg }}
                          >
                            {cfg?.label ?? lead.status}
                          </span>
                          <div className="absolute left-0 top-8 z-10 hidden group-hover/status:block bg-[#222] border border-white/10 rounded-xl shadow-xl p-2 min-w-44">
                            {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
                              <button
                                key={k}
                                onClick={() => handleStatusChange(lead, k as LeadStatus)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  lead.status === k ? 'opacity-50' : 'hover:bg-white/[0.06]'
                                }`}
                                style={{ color: v.color }}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-white/30 text-xs">{formatDate(lead.ultimo_contato)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setAtendimentoLead(lead)}
                            title="Registrar Atendimento"
                            className="p-1.5 text-white/30 hover:text-[#c8a96e] transition-colors"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => { setEditLead(lead); setShowModal(true) }}
                            title="Editar"
                            className="p-1.5 text-white/30 hover:text-white/70 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          {userRole === 'gestora' && (
                            <button
                              onClick={() => handleDelete(lead.id)}
                              title="Excluir"
                              className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null) }}
          onSaved={load}
        />
      )}
      {atendimentoLead && (
        <AtendimentoModal
          lead={atendimentoLead}
          onClose={() => setAtendimentoLead(null)}
          onSaved={load}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
