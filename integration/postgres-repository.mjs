// Storage adapter for a verified server-side account. No database connection is made here.
// pool must be a private PostgreSQL pool supplied by the authenticated API.
export function criarRepositorioSnapshots(pool) {
  if (!pool || typeof pool.query !== 'function') throw new Error('Pool PostgreSQL obrigatório');
  async function consultar(accountId) {
    const {rows}=await pool.query(
      'SELECT schema_version, payload, revision, updated_at FROM jm_snapshots WHERE account_id = $1::uuid',
      [accountId]
    );
    return rows[0] ?? null;
  }
  async function salvar(accountId, snapshot, revisaoEsperada) {
    if (!Number.isSafeInteger(revisaoEsperada) || revisaoEsperada < 0)
      throw new Error('Revisão esperada inválida');
    const {validarSnapshot}=await import('./snapshot-readonly.mjs');
    validarSnapshot(snapshot);
    const {rows}=await pool.query(
      `INSERT INTO jm_snapshots (account_id, schema_version, payload, revision)
       SELECT $1::uuid, 2, $2::jsonb, 1 WHERE $3::bigint = 0
       ON CONFLICT (account_id) DO UPDATE
       SET payload=EXCLUDED.payload, revision=jm_snapshots.revision+1, updated_at=now()
       WHERE jm_snapshots.revision=$3::bigint
       RETURNING revision, updated_at`,
      [accountId,JSON.stringify(snapshot),revisaoEsperada]
    );
    if (!rows.length) return {conflict:true};
    return {conflict:false,revision:rows[0].revision,updatedAt:rows[0].updated_at};
  }
  return Object.freeze({consultar,salvar});
}
