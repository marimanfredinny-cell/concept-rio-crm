'use client'

import { useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_CONFIG } from '@/types'

interface AtendimentoModalProps {
  lead: Lead
  onClose: () => void
  onSaved: () => void
  currentUser: string
}

const TIPOS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'visita', label: 'Visita' },
  { value: 'nota', label: 'Nota Interna' },
]

export default function AtendimentoModal({ lead, onClose, onSaved, currentUser }: AtendimentoModalProps) {
  const [tipo, setTipo] = useState('whatsapp')
  const [descricao, setDescricao] = useState('')
  const [novoStatus, setNovoStatus] = useState<LeadStatus>(lead.status)
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const sb = createClient()
    const now = new Date().toISOString().split('T')[0]

    await sb.from('atendimentos').insert({
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo,
      descricao,
      status: 'realizado',
      data,
      corretor: currentUser,
    })

    if (novoStatus !== lead.status) {
      await sb.from('leads').update({ status: novoStatus, ultimo_contato: now }).eq('id', lead.id)
      await sb.from('historico_leads').insert({
        lead_id: lead.id,
        lead_nome: lead.nome,
        status_anterior: lead.status,
        status_novo: novoStatus,
        corretor: currentUser,
      })
    } else {
      await sb.from('leads').update({ ultimo_contato: now }).eq('id', lead.id)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/[0.08] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white font-semibold">Registrar Atendimento</h2>
            <p className="text-white/30 text-xs mt-0.5">{lead.nome}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    tipo === t.value
                      ? 'bg-[#c8a96e]/10 text-[#c8a96e] border-[#c8a96e]/30'
                      : 'text-white/40 border-white/10 hover:text-white/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#c8a96e]/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o atendimento..."
              className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/40 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">
              Atualizar Status
            </label>
            <select
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value as LeadStatus)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#c8a96e]/40 transition-colors"
            >
              {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <MessageSquare size={14} />
            {saving ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
