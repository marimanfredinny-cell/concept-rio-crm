'use client'

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Imovel } from '@/types'

interface ImovelModalProps {
  imovel?: Imovel | null
  onClose: () => void
  onSaved: () => void
}

const blank = (): Partial<Imovel> => ({
  titulo: '',
  tipo: 'Apartamento',
  status: 'disponivel',
  preco: undefined,
  area: undefined,
  quartos: undefined,
  banheiros: undefined,
  vagas: undefined,
  bairro: '',
  cidade: 'Rio de Janeiro',
  descricao: '',
})

export default function ImovelModal({ imovel, onClose, onSaved }: ImovelModalProps) {
  const [form, setForm] = useState<Partial<Imovel>>(imovel ?? blank())
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(imovel ?? blank()) }, [imovel])

  const set = (k: keyof Imovel, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.titulo) return
    setSaving(true)
    const sb = createClient()
    const now = new Date().toISOString()

    const data = {
      ...form,
      preco: Number(form.preco) || 0,
      area: Number(form.area) || 0,
      quartos: Number(form.quartos) || 0,
      banheiros: Number(form.banheiros) || 0,
      vagas: Number(form.vagas) || 0,
      updated_at: now,
    }

    if (imovel?.id) {
      await sb.from('imoveis').update(data).eq('id', imovel.id)
    } else {
      await sb.from('imoveis').insert({ ...data, cidade: data.cidade ?? 'Rio de Janeiro' })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const Field = (label: string, key: keyof Imovel, placeholder = '', type = 'text') => (
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/[0.08] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">{imovel ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {Field('Título *', 'titulo', 'Ex: Apartamento 3 quartos - Leblon')}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Tipo</label>
              <select
                value={form.tipo ?? 'Apartamento'}
                onChange={e => set('tipo', e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
              >
                {['Apartamento', 'Casa', 'Cobertura', 'Studio', 'Kitnet', 'Sala Comercial', 'Terreno'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Status</label>
              <select
                value={form.status ?? 'disponivel'}
                onChange={e => set('status', e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
              >
                {['disponivel', 'reservado', 'vendido', 'alugado', 'inativo'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Field('Preço (R$)', 'preco', '1500000', 'number')}
            {Field('Área (m²)', 'area', '120', 'number')}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Field('Quartos', 'quartos', '3', 'number')}
            {Field('Banheiros', 'banheiros', '2', 'number')}
            {Field('Vagas', 'vagas', '2', 'number')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Field('Bairro', 'bairro', 'Leblon')}
            {Field('Cidade', 'cidade', 'Rio de Janeiro')}
          </div>
          {Field('URL no Ego RE', 'url_ego', 'https://...')}
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 tracking-widest uppercase">Descrição</label>
            <textarea
              value={form.descricao ?? ''}
              onChange={e => set('descricao', e.target.value)}
              rows={3}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c8a96e]/40 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-5 py-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.titulo}
            className="flex items-center gap-2 px-5 py-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={14} />
            {saving ? 'Salvando...' : imovel ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
