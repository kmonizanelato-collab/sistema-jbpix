-- JBPIXS — painel interno
-- Rode uma vez contra o banco Neon: npm run db:setup

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'funcionario' CHECK (role IN ('admin', 'funcionario')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS themes (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL,          -- nome do ícone Lucide
  sort_order INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id         SERIAL PRIMARY KEY,
  theme_id   INT  NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  subtitle   TEXT,
  sort_order INT  NOT NULL DEFAULT 0,
  UNIQUE (theme_id, slug)
);

-- Uma arte = a imagem-modelo (tabelas VAZIAS) + os dados das tabelas.
-- A imagem-modelo nunca é alterada; o resultado é sempre re-renderizado a
-- partir dela. Assim o admin pode reeditar quantas vezes quiser sem que a
-- imagem acumule sujeira de renderizações anteriores.
CREATE TABLE IF NOT EXISTS arts (
  id             SERIAL PRIMARY KEY,
  card_id        INT  NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  template_url   TEXT NOT NULL,      -- Vercel Blob: arte com as tabelas vazias
  template_w     INT  NOT NULL,
  template_h     INT  NOT NULL,
  layout         JSONB NOT NULL DEFAULT '{"boxes":[]}'::jsonb,
  tables         JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_url   TEXT,               -- resultado; NULL = ainda sem tabela preenchida
  rendered_at    TIMESTAMPTZ,
  published      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arts_card_idx ON arts (card_id, created_at DESC);
