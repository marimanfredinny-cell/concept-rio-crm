import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  // Parse body — aceita JSON ou form-encoded
  let data: Record<string, string> = {}
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      data = await req.json()
    } else {
      const text = await req.text()
      for (const pair of text.split('&')) {
        const [k, v] = pair.split('=')
        if (k) data[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
      }
    }
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400, headers: CORS })
  }

  // Validação do secret (se configurado)
  if (WEBHOOK_SECRET) {
    const headerSecret = req.headers.get('x-webhook-secret')
    if (headerSecret !== WEBHOOK_SECRET && data.secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401, headers: CORS })
    }
  }

  // Extração dos campos — aceita variações de nome (GTM, RD Station, forms nativos, etc.)
  const nome = (
    data.nome ?? data.name ?? data.nome_completo ?? data.full_name ??
    data.nome_lead ?? data.cliente_nome ?? data.contact_name ??
    data['Nome'] ?? data['Name'] ?? ''
  ).trim()

  const telefone = (
    data.telefone ?? data.phone ?? data.celular ?? data.whatsapp ??
    data.fone ?? data.tel ?? data.phone_number ?? data.mobile ??
    data['Telefone'] ?? data['Phone'] ?? data['Celular'] ?? ''
  ).trim()

  const email = (data.email ?? data.Email ?? data.e_mail ?? '').trim() || undefined

  const mensagem = (
    data.mensagem ?? data.message ?? data.descricao ?? data.observacao ??
    data.comentario ?? data.text ?? ''
  ).trim() || undefined

  const interesse = (
    data.imovel ?? data.imovel_titulo ?? data.property ?? data.produto ??
    data.empreendimento ?? data.imovel_interesse ?? data.titulo ?? ''
  ).trim() || undefined

  const bairro = (
    data.bairro ?? data.bairro_interesse ?? data.neighborhood ?? data.regiao ?? ''
  ).trim() || undefined

  const utmSource = (data.utm_source ?? data.utmSource ?? '').trim() || undefined
  const utmMedium = (data.utm_medium ?? data.utmMedium ?? '').trim() || undefined
  const utmCampaign = (data.utm_campaign ?? data.utmCampaign ?? '').trim() || undefined
  const utmContent = (data.utm_content ?? data.utmContent ?? '').trim() || undefined

  // Aceita origem explícita do body (ex: GTM enviando "Site - Imovel")
  const origemExplicita = (data.origem ?? data.source ?? data.canal ?? '').trim() || undefined

  // Pelo menos um identificador é obrigatório
  if (!nome && !telefone && !email) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: envie ao menos nome, telefone ou email' },
      { status: 400, headers: CORS }
    )
  }

  function resolveOrigem(): string {
    if (origemExplicita) return origemExplicita
    const src = (utmSource ?? '').toLowerCase()
    const med = (utmMedium ?? '').toLowerCase()
    if (src.includes('google') || med.includes('cpc')) return 'Google Ads'
    if (src.includes('facebook') || src.includes('meta') || med.includes('paid_social')) return 'Meta Ads'
    if (src.includes('instagram')) return 'Instagram'
    if (src.includes('whatsapp')) return 'WhatsApp'
    if (src.includes('indicacao') || src.includes('indicação')) return 'Indicação'
    if (med.includes('organic') || src.includes('organic')) return 'Site'
    return 'Site'
  }

  const today = new Date().toISOString().split('T')[0]
  const supabase = createAdminClient()

  // Evitar duplicatas por telefone (se informado)
  if (telefone) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('telefone', telefone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { ok: true, status: 'duplicate', message: 'Lead já existe com este telefone' },
        { headers: CORS }
      )
    }
  }

  const { error } = await supabase.from('leads').insert({
    nome: nome || 'Lead sem nome',
    telefone: telefone || 'Não informado',
    email,
    origem: resolveOrigem(),
    interesse,
    bairro_interesse: bairro,
    notas: mensagem,
    corretor: '',
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    status: 'novo',
    data_entrada: today,
    ultimo_contato: today,
  })

  if (error) {
    console.error('Webhook lead insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }

  return NextResponse.json({ ok: true, status: 'created' }, { headers: CORS })
}
