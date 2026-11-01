-- JM Financeiro: esquema inicial para armazenamento durável e isolado.
-- Executar apenas em banco PostgreSQL privado com backups habilitados.
-- Nenhum dado financeiro é migrado automaticamente.
BEGIN;
CREATE TABLE IF NOT EXISTS jm_accounts (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jm_snapshots (
  account_id uuid PRIMARY KEY REFERENCES jm_accounts(id) ON DELETE CASCADE,
  schema_version integer NOT NULL CHECK (schema_version = 2),
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jm_payload_is_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT jm_payload_size CHECK (octet_length(payload::text) <= 2000000)
);
CREATE INDEX IF NOT EXISTS jm_snapshots_updated_at_idx ON jm_snapshots(updated_at);
COMMIT;
