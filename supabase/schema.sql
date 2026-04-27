-- ============================================================
-- Concept Rio CRM - Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  origem TEXT,
  interesse TEXT,
  orcamento NUMERIC DEFAULT 0,
  notas TEXT,
  corretor TEXT,
  bairro_interesse TEXT,
  tipo_imovel_interesse TEXT,
  quartos_desejados INTEGER,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  status TEXT NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','contato','visita_agendada','visita_realizada','proposta','negociacao','fechado','perdido')),
  data_entrada DATE DEFAULT CURRENT_DATE,
  ultimo_contato DATE DEFAULT CURRENT_DATE,
  ego_lead_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HISTORICO DE LEADS (mudanças de status)
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lead_nome TEXT,
  status_anterior TEXT,
  status_novo TEXT,
  corretor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATENDIMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS atendimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lead_nome TEXT,
  tipo TEXT DEFAULT 'whatsapp'
    CHECK (tipo IN ('ligacao','whatsapp','email','visita','nota')),
  descricao TEXT,
  status TEXT DEFAULT 'realizado'
    CHECK (status IN ('agendado','realizado','cancelado')),
  data DATE DEFAULT CURRENT_DATE,
  corretor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IMOVEIS (manual + sincronizado do Ego Real Estate)
-- ============================================================
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ego_id TEXT UNIQUE,
  titulo TEXT NOT NULL DEFAULT '',
  tipo TEXT,
  status TEXT DEFAULT 'disponivel',
  preco NUMERIC DEFAULT 0,
  area NUMERIC DEFAULT 0,
  quartos INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  vagas INTEGER DEFAULT 0,
  bairro TEXT,
  cidade TEXT DEFAULT 'Rio de Janeiro',
  descricao TEXT,
  imagens JSONB DEFAULT '[]',
  url_ego TEXT,
  dados_completos JSONB,
  sincronizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAMPANHAS ADS (Google Ads + Meta Ads)
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhas_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('google_ads','meta_ads')),
  campanha_id TEXT NOT NULL,
  nome TEXT,
  status TEXT,
  orcamento NUMERIC,
  gasto NUMERIC DEFAULT 0,
  impressoes INTEGER DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campanha_id, plataforma)
);

-- ============================================================
-- PROFILES (vinculado ao auth.users do Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'corretor'
    CHECK (role IN ('corretor','gestora','admin')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: criar profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'corretor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados podem ler/escrever tudo
-- (refinamento de permissão por role pode ser feito depois)
CREATE POLICY "auth_read_leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_leads" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_leads" ON leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_all_historico" ON historico_leads FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_atendimentos" ON atendimentos FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_imoveis" ON imoveis FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_campanhas" ON campanhas_ads FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_corretor ON leads(corretor);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_historico_lead_id ON historico_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_lead_id ON atendimentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON atendimentos(data);
CREATE INDEX IF NOT EXISTS idx_imoveis_ego_id ON imoveis(ego_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plataforma ON campanhas_ads(plataforma);
CREATE INDEX IF NOT EXISTS idx_leads_ego_lead_id ON leads(ego_lead_id);

-- ============================================================
-- MIGRAÇÃO: adicionar ego_lead_id se a tabela já existir
-- Execute apenas se o banco já estiver criado
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ego_lead_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_leads_ego_lead_id ON leads(ego_lead_id);
