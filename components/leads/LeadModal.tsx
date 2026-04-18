'use client'

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUS_CONFIG, ORIGENS, CORRETORES } from '@/types'

interface LeadModalProps {
  lead?: Lead | null
  onClose: () => void
  onSaved: () => void
}

const today = () => new Date().toISOString().split('T')[0]

const blank = (): Partial<Lead> => ({
  nome: '',
  telefone: '',
  email: '',
  origem: 'Meta Ads',
  interesse: '',
  orcamento: undefined,
  notas: '',
  corretor: 'Luiz',
  bairro_interesse: '',
  tipo_imovel_interesse: '',
  quartos_desejados: undefined,
  utm_campaign: '',
  utm_source: '',
  utm_medium: '',
  utm_content: '',
})

export default function LeadModal({ lead, onClose, onSaved }: LeadModalProps) {
  const [form, setForm] = useState<Partial<Lead>>(lead ?? blank())
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(lead ?? blank()) }, [lead])

  const set = (k: keyof Lead, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.nome || !form.telefone) return
    setSaving(true)
    const sb = createClient()
    const now = today()

    if (lead?.id) {
      await sb.from('leads').update({ ...form, ultimo_contato: now }).eq('id', lead.id)
    } else {
      await sb.from('leads').insert({
        ...form,
        orcamento: Number(form.orcamento) || 0,
        quartos_desejados: Number(form.quartos_desejados) || null,
        status: 'novo' as LeadStatus,
        data_entrada: now,
        ultimo_contato: now,
      })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const Field = (
    label: string,
    key: keyof Lead,
    placeholder = '',
    type: 'text' | 'number' | 'email' | 'tel' | 'date' = 'text'
  ) => (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">{label}</label>
      <input
        type={type}
        value={(form[key] as string | number | undefined) ?? ''}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/40 transition-colors"
      />
    </div>
  )

  const Select = (label: string, key: keyof Lead, options: string[]) => (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">{label}</label>
      <select
        value={(form[key] as string) ?? ''}
        onChange={e => set(key, e.target.value)}
        className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#c8a96e]/40 transition-colors"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/[0.08] rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{lead ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Field('Nome *', 'nome', 'Nome completo')}
            {Field('Telefone *', 'telefone', '(21) 99999-9999', 'tel')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Field('Email', 'email', 'email@exemplo.com', 'email')}
            {Select('Origem', 'origem', ORIGENS)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Select('Corretor', 'corretor', CORRETORES)}
            {lead && (
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Status</label>
                <select
                  value={form.status ?? 'novo'}
                  onChange={e => set('status', e.target.value as LeadStatus)}
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#c8a96e]/40 transition-colors"
                >
                  {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <hr className="border-white/[0.06]" />
          <p className="text-white/30 text-[11px] tracking-widest uppercase">Interesse</p>

          <div className="grid grid-cols-2 gap-4">
            {Field('Imóvel / Empreendimento', 'interesse', 'Ex: Leblon, Ipanema...')}
            {Field('Orçamento (R$)', 'orcamento', '500000', 'number')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Field('Bairro de Interesse', 'bairro_interesse', 'Ex: Leblon')}
            {Field('Tipo do Imóvel', 'tipo_imovel_interesse', 'Apartamento, Casa...')}
          </div>
          {Field('Quartos Desejados', 'quartos_desejados', '2', 'number')}

          <hr className="border-white/[0.06]" />
          <p className="text-white/30 text-[11px] tracking-widest uppercase">UTM (Tráfego Pago)</p>

          <div className="grid grid-cols-2 gap-4">
            {Field('UTM Source', 'utm_source', 'google')}
            {Field('UTM Medium', 'utm_medium', 'cpc')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Field('UTM Campaign', 'utm_campaign', 'campanha-leblon')}
            {Field('UTM Content', 'utm_content', 'variante-a')}
          </div>

          <hr className="border-white/[0.06]" />
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Observações</label>
            <textarea
              value={form.notas ?? ''}
              onChange={e => set('notas', e.target.value)}
              rows={3}
              placeholder="Informações adicionais sobre o lead..."
              className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/40 transition-colors resize-none"
            />
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
            disabled={saving || !form.nome || !form.telefone}
            className="flex items-center gap-2 px-5 py-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={14} />
            {saving ? 'Salvando...' : lead ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
