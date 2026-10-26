-- Login de produção: somente identidade Euler; tokens são armazenados como SHA-256.
CREATE TABLE IF NOT EXISTS auth_users (
 username text PRIMARY KEY CHECK (username = 'euler'),
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_digest char(64) PRIMARY KEY,
 username text NOT NULL REFERENCES auth_users(username) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions(username,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS auth_login_attempts (
 username text PRIMARY KEY,
 failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
 locked_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
