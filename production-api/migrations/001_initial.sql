-- JM Financeiro 2.0: esquema inicial PostgreSQL, não implantado.
BEGIN;
CREATE TABLE establishments (
 id uuid PRIMARY KEY,
 name text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounts (
 id uuid PRIMARY KEY,
 establishment_id uuid NOT NULL REFERENCES establishments(id),
 name text NOT NULL,
 opening_cents bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(establishment_id,name),
 UNIQUE(id,establishment_id)
);
CREATE TABLE categories (
 id uuid PRIMARY KEY,
 establishment_id uuid NOT NULL REFERENCES establishments(id),
 name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(establishment_id,name),
 UNIQUE(id,establishment_id)
);
CREATE TABLE entries (
 id uuid PRIMARY KEY,
 establishment_id uuid NOT NULL REFERENCES establishments(id),
 kind text NOT NULL CHECK (kind IN ('income','expense')),
 account_id uuid NOT NULL,
 category_id uuid NOT NULL,
 description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 240),
 amount_cents bigint NOT NULL CHECK(amount_cents > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,establishment_id) REFERENCES accounts(id,establishment_id),
 FOREIGN KEY(category_id,establishment_id) REFERENCES categories(id,establishment_id)
);
CREATE TABLE transfers (
 id uuid PRIMARY KEY,
 establishment_id uuid NOT NULL REFERENCES establishments(id),
 from_account_id uuid NOT NULL,
 to_account_id uuid NOT NULL,
 description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 240),
 amount_cents bigint NOT NULL CHECK(amount_cents > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(from_account_id <> to_account_id),
 FOREIGN KEY(from_account_id,establishment_id) REFERENCES accounts(id,establishment_id),
 FOREIGN KEY(to_account_id,establishment_id) REFERENCES accounts(id,establishment_id)
);
CREATE TABLE request_log (
 idempotency_key text PRIMARY KEY,
 fingerprint text NOT NULL,
 response_json jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit (
 id uuid PRIMARY KEY,
 actor text NOT NULL,
 action text NOT NULL,
 record_id uuid NOT NULL,
 establishment_id uuid REFERENCES establishments(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_establishment_created ON entries(establishment_id,created_at DESC);
CREATE INDEX transfers_establishment_created ON transfers(establishment_id,created_at DESC);
CREATE INDEX audit_created ON audit(created_at DESC);
COMMIT;
