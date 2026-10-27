// Storage adapter for a verified server-side account. No database connection is made here.
// pool must be a private PostgreSQL pool supplied by the authenticated API.
export function criarRepositorioSnapshots(pool) {
  if (!pool || typeof pool.query !== 'function') throw new Error('Pool PostgreSQL obrigatório');
  function validarConta(accountId) {
    if (typeof accountId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId))
      throw new Error('Conta autenticada inválida');
  }
  async function consultar(accountId) {
    validarConta(accountId);
    const {rows}=await pool.query(
      'SELECT schema_version, payload, revision, updated_at FROM jm_snapshots WHERE account_id = $1::uuid',
      [accountId]
    );
    return rows[0] ?? null;
  }
  async function salvar(accountId, snapshot, revisaoEsperada) {
    validarConta(accountId);
    if (!Number.isSafeInteger(revisaoEsperada) || revisaoEsperada < 0)
      throw new Error('Revisão esperada inválida');
    const {validarSnapshot}=await import('./snapshot-readonly.mjs');
    validarSnapshot(snapshot);
    const payload = JSON.stringify(snapshot);
    if (Buffer.byteLength(payload, 'utf8') > 2_000_000) throw new Error('Backup excede o limite de armazenamento');
    // Provisionamento e gravação em uma única instrução atômica.
    // O identificador da conta vem exclusivamente do token validado pela API.
    const {rows}=await pool.query(
      `WITH provisioned AS (
         INSERT INTO jm_accounts (id) VALUES ($1::uuid)
         ON CONFLICT (id) DO NOTHING
         RETURNING id
       )
       INSERT INTO jm_snapshots (account_id, schema_version, payload, revision)
       SELECT $1::uuid, 2, $2::jsonb, 1
       WHERE $3::bigint = 0
       ON CONFLICT (account_id) DO UPDATE
       SET payload=EXCLUDED.payload, revision=jm_snapshots.revision+1, updated_at=now()
       WHERE jm_snapshots.revision=$3::bigint
       RETURNING revision, updated_at`,
      [accountId,payload,revisaoEsperada]
    );
    if (!rows.length) return {conflict:true};
    return {conflict:false,revision:rows[0].revision,updatedAt:rows[0].updated_at};
  }
  return Object.freeze({consultar,salvar});
}
