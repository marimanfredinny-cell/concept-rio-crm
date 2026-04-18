'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LeadModal from '@/components/leads/LeadModal'
import AtendimentoModal from '@/components/leads/AtendimentoModal'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_CONFIG, formatCurrency } from '@/types'

const PIPELINE_COLUMNS: LeadStatus[] = [
  'novo', 'contato', 'visita_agendada', 'visita_realizada', 'proposta', 'negociacao', 'fechado', 'perdido',
]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [atendimentoLead, setAtendimentoLead] = useState<Lead | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDrop = async (status: LeadStatus) => {
    if (!draggedId) return
    const lead = leads.find(l => l.id === draggedId)
    if (!lead || lead.status === status) { setDraggedId(null); return }
    const sb = createClient()
    const now = new Date().toISOString().split('T')[0]
    await sb.from('leads').update({ status, ultimo_contato: now }).eq('id', draggedId)
    await sb.from('historico_leads').insert({
      lead_id: draggedId,
      lead_nome: lead.nome,
      status_anterior: lead.status,
      status_novo: status,
      corretor: lead.corretor,
    })
    setDraggedId(null)
    load()
  }

  const byStatus = (status: LeadStatus) => leads.filter(l => l.status === status)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Pipeline</h1>
          <p className="text-white/30 text-sm mt-1">Arraste para mover entre etapas</p>
        </div>
        <button
          onClick={() => { setEditLead(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Lead
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {PIPELINE_COLUMNS.map(status => {
          const cfg = LEAD_STATUS_CONFIG[status]
          const col = byStatus(status)
          return (
            <div
              key={status}
              className="flex-shrink-0 w-56"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(status)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-white/50 text-xs font-medium">{cfg.label}</span>
                <span className="ml-auto text-white/25 text-xs">{col.length}</span>
              </div>

              <div className="space-y-2 min-h-20">
                {col.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className={`bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:border-white/[0.12] ${
                      draggedId === lead.id ? 'opacity-40' : ''
                    }`}
                  >
                    <p className="text-white/80 text-xs font-medium mb-1 leading-snug">{lead.nome}</p>
                    <p className="text-white/30 text-[11px] mb-2">{lead.telefone}</p>
                    {lead.orcamento ? (
                      <p className="text-[#c8a96e] text-[11px] font-medium mb-2">{formatCurrency(lead.orcamento)}</p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-white/25 text-[10px]">{lead.corretor}</span>
                      <button
                        onClick={() => setAtendimentoLead(lead)}
                        className="text-white/20 hover:text-[#c8a96e] transition-colors text-[10px]"
                      >
                        + ação
                      </button>
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div className="border-2 border-dashed border-white/[0.06] rounded-xl h-16 flex items-center justify-center">
                    <span className="text-white/15 text-xs">Solte aqui</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
          currentUser="Luiz"
        />
      )}
    </div>
  )
}
