import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_ID = process.env.META_APP_ID
const APP_SECRET = process.env.META_APP_SECRET
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID

export async function POST(req: NextRequest) {
  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    return NextResponse.json(
      { error: 'Credenciais Meta Ads não configuradas. Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env.local' },
      { status: 400 }
    )
  }

  try {
    const fields = 'id,name,status,daily_budget,lifetime_budget'
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v20.0/act_${AD_ACCOUNT_ID}/campaigns?fields=${fields}&access_token=${ACCESS_TOKEN}&limit=50`
    )

    if (!campaignsRes.ok) {
      const err = await campaignsRes.text()
      return NextResponse.json({ error: `Meta API error: ${err}` }, { status: 400 })
    }

    const { data: campaigns } = await campaignsRes.json()
    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Resposta inválida da API do Meta' }, { status: 400 })
    }

    const records = await Promise.all(
      campaigns.map(async (c: Record<string, unknown>) => {
        const insightFields = 'spend,impressions,clicks,actions,cpc,ctr,reach'
        const insightRes = await fetch(
          `https://graph.facebook.com/v20.0/${c.id}/insights?fields=${insightFields}&date_preset=last_30d&access_token=${ACCESS_TOKEN}`
        )
        const insightData = await insightRes.json()
        const insight = insightData.data?.[0] ?? {}

        const conversoes = Array.isArray(insight.actions)
          ? insight.actions.find((a: Record<string, string>) => a.action_type === 'lead')?.value ?? 0
          : 0

        return {
          plataforma: 'meta_ads',
          campanha_id: String(c.id),
          nome: c.name,
          status: String(c.status ?? '').toLowerCase(),
          orcamento: Number(c.daily_budget ?? c.lifetime_budget ?? 0) / 100,
          gasto: Number(insight.spend ?? 0),
          impressoes: Number(insight.impressions ?? 0),
          cliques: Number(insight.clicks ?? 0),
          conversoes: Number(conversoes),
          cpc: Number(insight.cpc ?? 0),
          ctr: Number(insight.ctr ?? 0),
          sincronizado_em: new Date().toISOString(),
        }
      })
    )

    const supabase = await createClient()
    const { error } = await supabase
      .from('campanhas_ads')
      .upsert(records, { onConflict: 'campanha_id,plataforma' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, synced: records.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
