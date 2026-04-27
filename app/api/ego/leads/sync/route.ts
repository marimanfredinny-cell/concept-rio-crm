import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EGO_API_KEY = process.env.EGO_API_KEY
const EGO_EMPRESA_ID = process.env.EGO_EMPRESA_ID
const EGO_BASE_URL = 'https://api.ego.imobiliario.com.br/v1'

interface EgoLead {
  id: string | number
  nome?: string
  name?: string
  telefone?: string
  phone?: string
  celular?: string
  email?: string
  mensagem?: string
  message?: string
  descricao?: string
  imovel_interesse?: string
  imovel?: { titulo?: string; tipo?: string }
  bairro_interesse?: string
  bairro?: string
  tipo_imovel?: string
  quartos?: number
  orcamento?: number
  budget?: number
  origem?: string
  canal?: string
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  created_at?: string
  data_criacao?: string
  data?: string
  [key: string]: unknown
}

function extractPhone(lead: EgoLead): string {
  return lead.telefone ?? lead.phone ?? lead.celular ?? ''
}

function extractNome(lead: EgoLead): string {
  return lead.nome ?? lead.name ?? 'Lead Ego'
}

function extractOrigem(lead: EgoLead): string {
  const raw = lead.origem ?? lead.canal ?? lead.source ?? lead.utm_source ?? ''
  if (!raw) return 'Site'
  const map: Record<string, string> = {
    google: 'Google Ads',
    google_ads: 'Google Ads',
    facebook: 'Meta Ads',
    instagram: 'Instagram',
    meta: 'Meta Ads',
    meta_ads: 'Meta Ads',
    whatsapp: 'WhatsApp',
    indicacao: 'Indicação',
    zap: 'ZAP Imóveis',
    olx: 'OLX',
    site: 'Site',
    organic: 'Site',
  }
  const key = raw.toLowerCase().replace(/[^a-z_]/g, '_')
  return map[key] ?? map[raw.toLowerCase()] ?? 'Site'
}

function extractDataEntrada(lead: EgoLead): string {
  const raw = lead.created_at ?? lead.data_criacao ?? lead.data
  if (!raw) return new Date().toISOString().split('T')[0]
  const d = new Date(raw)
  return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  if (!EGO_API_KEY || !EGO_EMPRESA_ID) {
    return NextResponse.json(
      { error: 'Credenciais Ego Real Estate não configuradas. Configure EGO_API_KEY e EGO_EMPRESA_ID no .env.local' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    let page = 1
    let total = 0
    let inserted = 0
    let updated = 0

    while (true) {
      const res = await fetch(
        `${EGO_BASE_URL}/leads?empresa_id=${EGO_EMPRESA_ID}&page=${page}&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${EGO_API_KEY}`,
            Accept: 'application/json',
          },
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json(
          { error: `Ego RE API erro ${res.status}: ${errText}` },
          { status: 502 }
        )
      }

      const body = await res.json()
      const items: EgoLead[] =
        body.data ?? body.leads ?? body.contatos ?? body.results ??
        (Array.isArray(body) ? body : [])

      if (!Array.isArray(items) || items.length === 0) {
        if (page === 1) {
          return NextResponse.json({ ok: true, total: 0, inserted: 0, updated: 0, debug_body: body })
        }
        break
      }

      total += items.length

      for (const lead of items) {
        const egoLeadId = String(lead.id)
        const telefone = extractPhone(lead)
        const nome = extractNome(lead)
        const dataEntrada = extractDataEntrada(lead)

        // Check if lead already exists by ego_lead_id
        const { data: existing } = await supabase
          .from('leads')
          .select('id, status, corretor, notas')
          .eq('ego_lead_id', egoLeadId)
          .maybeSingle()

        if (existing) {
          // Update contact info only — preserve CRM-managed fields
          await supabase.from('leads').update({
            nome,
            telefone: telefone || 'Não informado',
            email: lead.email ?? undefined,
            bairro_interesse: lead.bairro_interesse ?? lead.bairro ?? undefined,
            tipo_imovel_interesse: lead.tipo_imovel ?? undefined,
            quartos_desejados: lead.quartos ?? undefined,
            orcamento: lead.orcamento ?? lead.budget ?? undefined,
            utm_source: lead.utm_source ?? undefined,
            utm_medium: lead.utm_medium ?? undefined,
            utm_campaign: lead.utm_campaign ?? undefined,
            utm_content: lead.utm_content ?? undefined,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          updated++
        } else {
          // Check for duplicate by phone to avoid doubles when phone was already manually entered
          let skipInsert = false
          if (telefone) {
            const { data: byPhone } = await supabase
              .from('leads')
              .select('id')
              .eq('telefone', telefone)
              .is('ego_lead_id', null)
              .maybeSingle()

            if (byPhone) {
              // Link the existing manual lead to this Ego record
              await supabase.from('leads').update({ ego_lead_id: egoLeadId }).eq('id', byPhone.id)
              updated++
              skipInsert = true
            }
          }

          if (!skipInsert) {
            const notas = lead.mensagem ?? lead.message ?? lead.descricao ?? undefined
            const { error } = await supabase.from('leads').insert({
              ego_lead_id: egoLeadId,
              nome,
              telefone: telefone || 'Não informado',
              email: lead.email ?? undefined,
              origem: extractOrigem(lead),
              interesse: lead.imovel_interesse ?? (lead.imovel as { titulo?: string })?.titulo ?? undefined,
              bairro_interesse: lead.bairro_interesse ?? lead.bairro ?? undefined,
              tipo_imovel_interesse: lead.tipo_imovel ?? undefined,
              quartos_desejados: lead.quartos ?? undefined,
              orcamento: lead.orcamento ?? lead.budget ?? undefined,
              notas: notas ?? undefined,
              corretor: '',
              utm_source: lead.utm_source ?? undefined,
              utm_medium: lead.utm_medium ?? undefined,
              utm_campaign: lead.utm_campaign ?? undefined,
              utm_content: lead.utm_content ?? undefined,
              status: 'novo',
              data_entrada: dataEntrada,
              ultimo_contato: dataEntrada,
            })
            if (!error) inserted++
          }
        }
      }

      if (!body.next_page && !body.meta?.next_page) break
      page++
    }

    return NextResponse.json({ ok: true, total, inserted, updated })
  } catch (err: unknown) {
    const cause = err instanceof Error ? (err as Error & { cause?: unknown }).cause : undefined
    const isNetworkError = String(err).includes('fetch failed') || String(err).includes('ENOTFOUND') || String(err).includes('ECONNREFUSED')
    return NextResponse.json({
      error: isNetworkError
        ? `Não foi possível conectar à API do Ego. Verifique se o endpoint está correto: ${EGO_BASE_URL}/leads`
        : String(err),
      cause: cause ? String(cause) : undefined,
      api_key_set: !!EGO_API_KEY,
      empresa_id: EGO_EMPRESA_ID,
      url_tentada: `${EGO_BASE_URL}/leads`,
    }, { status: 500 })
  }
}
