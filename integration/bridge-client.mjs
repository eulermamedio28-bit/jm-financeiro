// Cliente isolado da futura ponte segura. Não altera dados nem sincroniza automaticamente.
// Só pode ser usado depois que o gateway autenticado estiver implantado e validado.
import { validarSnapshot } from './snapshot-readonly.mjs';

export function criarClientePonte({ endpoint, obterToken, fetchImpl = fetch }) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('Endpoint HTTPS inválido');
  if (typeof obterToken !== 'function') throw new Error('Autenticação obrigatória');
  if (typeof fetchImpl !== 'function') throw new Error('Transporte indisponível');
  const base = url.href.replace(/\/$/, '');
  async function requisitar(caminho, { method = 'GET', body } = {}) {
    const token = await obterToken();
    if (typeof token !== 'string' || token.length < 16 || /[\r\n]/.test(token))
      throw new Error('Credencial ausente ou inválida');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const resposta = await fetchImpl(base + caminho, {
        method,
        redirect: 'error',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json',
          ...(body === undefined ? {} : {'Content-Type':'application/json'})
        },
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
        signal: controller.signal
      });
      if (!resposta.ok) throw new Error('Gateway indisponível ou acesso negado (' + resposta.status + ')');
      const tipo = resposta.headers.get('content-type') || '';
      if (!tipo.includes('application/json')) throw new Error('Resposta inesperada do gateway');
      return await resposta.json();
    } finally { clearTimeout(timeout); }
  }
  return Object.freeze({
    consultarStatus: () => requisitar('/v1/sync/status'),
    consultarSnapshot: () => requisitar('/v1/sync'),
    // Apenas envio manual explícito; não conectar a eventos de salvar dados.
    enviarSnapshot: (snapshot, expectedRevision) => {
      validarSnapshot(snapshot);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
        throw new Error('Revisão esperada obrigatória');
      const payload = {schemaVersion:2,snapshot,expectedRevision};
      if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 2_000_000)
        throw new Error('Backup excede o limite de envio');
      return requisitar('/v1/sync', {method:'POST',body:payload});
    }
  });
}
