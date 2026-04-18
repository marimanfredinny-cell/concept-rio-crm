import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EGO_API_KEY = process.env.EGO_API_KEY
const EGO_EMPRESA_ID = process.env.EGO_EMPRESA_ID
const EGO_BASE_URL = 'https://api.ego.imobiliario.com.br/v1'

interface EgoImovel {
  id: string | number
  titulo?: string
  tipo?: string
  finalidade?: string
  status?: string
  preco_venda?: number
  preco_locacao?: number
  area_total?: number
  area_util?: number
  quartos?: number
  banheiros?: number
  vagas?: number
  bairro?: string
  cidade?: string
  uf?: string
  descricao?: string
  fotos?: Array<{ url: string }>
  url?: string
  [key: string]: unknown
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
    let upserted = 0

    while (true) {
      const res = await fetch(
        `${EGO_BASE_URL}/imoveis?empresa_id=${EGO_EMPRESA_ID}&page=${page}&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${EGO_API_KEY}`,
            Accept: 'application/json',
          },
        }
      )

      if (!res.ok) break

      const body = await res.json()
      const items: EgoImovel[] = body.data ?? body.imoveis ?? body ?? []
      if (!Array.isArray(items) || items.length === 0) break

      total += items.length

      const records = items.map((im) => ({
        ego_id: String(im.id),
        titulo: im.titulo ?? '',
        tipo: im.tipo ?? im.finalidade ?? '',
        status: im.status ?? 'disponivel',
        preco: im.preco_venda ?? im.preco_locacao ?? 0,
        area: im.area_util ?? im.area_total ?? 0,
        quartos: im.quartos ?? 0,
        banheiros: im.banheiros ?? 0,
        vagas: im.vagas ?? 0,
        bairro: im.bairro ?? '',
        cidade: im.cidade ?? 'Rio de Janeiro',
        descricao: im.descricao ?? '',
        imagens: (im.fotos ?? []).map((f) => f.url).slice(0, 10),
        url_ego: im.url ?? '',
        dados_completos: im,
        sincronizado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('imoveis')
        .upsert(records, { onConflict: 'ego_id' })

      if (!error) upserted += records.length
      if (!body.next_page && !body.meta?.next_page) break
      page++
    }

    return NextResponse.json({ ok: true, total, upserted })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
