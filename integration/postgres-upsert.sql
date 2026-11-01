-- JM Financeiro: gravação otimista por revisão, com isolamento por conta.
-- A API autenticada deve determinar account_id pelo token verificado no servidor,
-- nunca por um identificador informado livremente pelo cliente.
-- Executar na mesma transação da autorização e validação do payload.
-- $1 account_id (uuid), $2 snapshot (jsonb), $3 revisão esperada (bigint).
-- Para primeira gravação, revisão esperada = 0.
INSERT INTO jm_snapshots (account_id, schema_version, payload, revision)
SELECT $1::uuid, 2, $2::jsonb, 1
WHERE $3::bigint = 0
ON CONFLICT (account_id) DO UPDATE
SET payload = EXCLUDED.payload,
    revision = jm_snapshots.revision + 1,
    updated_at = now()
WHERE jm_snapshots.revision = $3::bigint
RETURNING revision, updated_at;
-- Zero linhas retornadas = conflito de versão; responder HTTP 409.
-- Nunca sobrescrever silenciosamente uma revisão mais recente.
