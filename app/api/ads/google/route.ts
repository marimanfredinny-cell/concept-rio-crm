import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  if (!DEVELOPER_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CUSTOMER_ID) {
    return NextResponse.json(
      { error: 'Credenciais Google Ads não configuradas. Configure as variáveis GOOGLE_ADS_* no .env.local' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getAccessToken()

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.average_cpc,
        metrics.ctr,
        segments.date
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `

    const res = await fetch(
      `https://googleads.googleapis.com/v18/customers/${CUSTOMER_ID}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Google Ads API error: ${err}` }, { status: 400 })
    }

    const lines = await res.text()
    const records: Record<string, unknown>[] = []

    for (const line of lines.split('\n').filter(Boolean)) {
      try {
        const batch = JSON.parse(line)
        for (const row of batch.results ?? []) {
          records.push({
            plataforma: 'google_ads',
            campanha_id: row.campaign.id,
            nome: row.campaign.name,
            status: row.campaign.status.toLowerCase(),
            orcamento: (row.campaignBudget?.amountMicros ?? 0) / 1_000_000,
            gasto: (row.metrics.costMicros ?? 0) / 1_000_000,
            impressoes: Number(row.metrics.impressions ?? 0),
            cliques: Number(row.metrics.clicks ?? 0),
            conversoes: Number(row.metrics.conversions ?? 0),
            cpc: (row.metrics.averageCpc ?? 0) / 1_000_000,
            ctr: row.metrics.ctr ?? 0,
            sincronizado_em: new Date().toISOString(),
          })
        }
      } catch (parseErr) {
        console.error('Google Ads parse error:', parseErr)
      }
    }

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
