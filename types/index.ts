export type LeadStatus =
  | 'novo'
  | 'contato'
  | 'visita_agendada'
  | 'visita_realizada'
  | 'proposta'
  | 'negociacao'
  | 'fechado'
  | 'perdido'

export type UserRole = 'corretor' | 'gestora' | 'admin'

export interface Profile {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  created_at: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  email?: string
  origem: string
  interesse?: string
  orcamento?: number
  notas?: string
  corretor: string
  bairro_interesse?: string
  tipo_imovel_interesse?: string
  quartos_desejados?: number
  utm_campaign?: string
  utm_source?: string
  utm_medium?: string
  utm_content?: string
  status: LeadStatus
  data_entrada: string
  ultimo_contato: string
  created_at: string
}

export interface Atendimento {
  id: string
  lead_id: string
  lead_nome?: string
  tipo: 'ligacao' | 'whatsapp' | 'email' | 'visita' | 'nota'
  descricao?: string
  status?: string
  data: string
  corretor?: string
  created_at: string
}

export interface HistoricoLead {
  id: string
  lead_id: string
  lead_nome: string
  status_anterior: LeadStatus
  status_novo: LeadStatus
  corretor: string
  created_at: string
}

export interface Imovel {
  id: string
  ego_id?: string
  titulo: string
  tipo?: string
  status: string
  preco?: number
  area?: number
  quartos?: number
  banheiros?: number
  vagas?: number
  bairro?: string
  cidade: string
  descricao?: string
  imagens?: string[]
  url_ego?: string
  dados_completos?: Record<string, unknown>
  sincronizado_em?: string
  created_at: string
  updated_at: string
}

export interface CampanhaAds {
  id: string
  plataforma: 'google_ads' | 'meta_ads'
  campanha_id: string
  nome: string
  status: string
  orcamento?: number
  gasto?: number
  impressoes?: number
  cliques?: number
  conversoes?: number
  cpc?: number
  ctr?: number
  data_inicio?: string
  data_fim?: string
  sincronizado_em: string
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo Lead', color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  contato: { label: 'Contato Realizado', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  visita_agendada: { label: 'Visita Agendada', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  visita_realizada: { label: 'Visita Realizada', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  proposta: { label: 'Proposta Enviada', color: '#c8a96e', bg: 'rgba(200,169,110,0.08)' },
  negociacao: { label: 'Negociação', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  fechado: { label: 'Fechado', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  perdido: { label: 'Perdido', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
}

export const ORIGENS = [
  'Instagram',
  'Meta Ads',
  'Google Ads',
  'TikTok',
  'Indicação',
  'Site',
  'WhatsApp',
  'ZAP Imóveis',
  'OLX',
  'Outro',
]

export const CORRETORES = ['Luiz', 'Jean']

export function formatCurrency(value?: number | null): string {
  if (!value) return '—'
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value.toFixed(0)}`
}

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  const d = new Date(date + (date.includes('T') ? '' : 'T00:00:00'))
  return d.toLocaleDateString('pt-BR')
}
