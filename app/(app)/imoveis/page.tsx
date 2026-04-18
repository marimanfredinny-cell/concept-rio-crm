'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Plus, Building2, Search, ExternalLink, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Imovel } from '@/types'
import { formatCurrency } from '@/types'
import ImovelModal from '@/components/imoveis/ImovelModal'

export default function ImoveisPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editImovel, setEditImovel] = useState<Imovel | null>(null)
  const [syncMsg, setSyncMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('imoveis').select('*').order('created_at', { ascending: false })
    setImoveis(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/ego/sync', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        setSyncMsg(`Erro: ${json.error}`)
      } else {
        setSyncMsg(`✓ ${json.upserted} imóveis sincronizados`)
        load()
      }
    } catch {
      setSyncMsg('Erro ao sincronizar')
    }
    setSyncing(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir imóvel?')) return
    const sb = createClient()
    await sb.from('imoveis').delete().eq('id', id)
    load()
  }

  const filtered = imoveis.filter(i => {
    const s = search.toLowerCase()
    const matchSearch = !s || i.titulo.toLowerCase().includes(s) || (i.bairro ?? '').toLowerCase().includes(s)
    const matchStatus = filterStatus === 'todos' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  const STATUS_COLORS: Record<string, string> = {
    disponivel: '#34d399',
    vendido: '#f87171',
    alugado: '#a78bfa',
    reservado: '#f59e0b',
    inativo: '#6b7280',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">Imóveis</h1>
          <p className="text-white/30 text-sm mt-1">{filtered.length} imóveis</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Ego RE
          </button>
          <button
            onClick={() => { setEditImovel(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-[#c8a96e] hover:bg-[#dfc28e] text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          syncMsg.startsWith('Erro')
            ? 'bg-red-400/10 border-red-400/20 text-red-400'
            : 'bg-green-400/10 border-green-400/20 text-green-400'
        }`}>
          {syncMsg}
        </div>
      )}

      {/* Ego RE info banner */}
      <div className="mb-6 bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-xl p-4 flex items-start gap-3">
        <Building2 size={16} className="text-[#c8a96e] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[#c8a96e] text-sm font-medium">Integração Ego Real Estate</p>
          <p className="text-white/40 text-xs mt-0.5">
            Configure <code className="bg-white/10 px-1 rounded">EGO_API_KEY</code> e{' '}
            <code className="bg-white/10 px-1 rounded">EGO_EMPRESA_ID</code> no arquivo{' '}
            <code className="bg-white/10 px-1 rounded">.env.local</code> e clique em{' '}
            <strong className="text-white/60">Sync Ego RE</strong> para importar os imóveis automaticamente.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 flex-1">
          <Search size={14} className="text-white/30" />
          <input
            type="text"
            placeholder="Buscar por nome ou bairro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none flex-1"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2 text-white/60 text-sm focus:outline-none"
        >
          <option value="todos">Todos os Status</option>
          <option value="disponivel">Disponível</option>
          <option value="reservado">Reservado</option>
          <option value="vendido">Vendido</option>
          <option value="alugado">Alugado</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#c8a96e]/20 border-t-[#c8a96e] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-[#1a1a1a] border border-white/[0.06] rounded-xl text-white/20">
          <Building2 size={24} className="mb-2" />
          <p className="text-sm">Nenhum imóvel cadastrado</p>
          <p className="text-xs mt-1">Adicione manualmente ou sincronize com o Ego RE</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(im => {
            const img = Array.isArray(im.imagens) ? im.imagens[0] : null
            const statusColor = STATUS_COLORS[im.status] ?? '#6b7280'
            return (
              <div
                key={im.id}
                className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all group"
              >
                {img ? (
                  <img src={img} alt={im.titulo} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-white/[0.03] flex items-center justify-center">
                    <Building2 size={32} className="text-white/10" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white/80 font-medium text-sm leading-snug flex-1">{im.titulo}</p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0"
                      style={{ color: statusColor, background: `${statusColor}18` }}
                    >
                      {im.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs mb-3">
                    {[im.bairro, im.cidade].filter(Boolean).join(', ') || 'Rio de Janeiro'}
                  </p>
                  <div className="flex gap-3 text-white/40 text-xs mb-3">
                    {im.quartos ? <span>{im.quartos} quartos</span> : null}
                    {im.area ? <span>{im.area} m²</span> : null}
                    {im.vagas ? <span>{im.vagas} vagas</span> : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#c8a96e] font-semibold text-sm">{formatCurrency(im.preco)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {im.url_ego && (
                        <a
                          href={im.url_ego}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => { setEditImovel(im); setShowModal(true) }}
                        className="p-1.5 text-white/30 hover:text-white/60 transition-colors text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(im.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ImovelModal
          imovel={editImovel}
          onClose={() => { setShowModal(false); setEditImovel(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
