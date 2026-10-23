export class OrderError extends Error {
  constructor(status, code, fields = []) {
    super(code); this.status = status; this.code = code; this.fields = fields;
  }
}
function invalid(path, code = 'INVALID') { throw new OrderError(400, 'VALIDATION_ERROR', [{ path, code }]); }
function object(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
  if (Object.keys(value).some(key => !keys.includes(key))) invalid(path, 'UNKNOWN_FIELD');
}
function string(value, max, path, required = false) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    if (required) invalid(path, 'REQUIRED');
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > max) invalid(path);
  return value.trim();
}
function date(value, path, required = false) {
  const result = string(value, 10, path, required);
  if (result !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result)) invalid(path);
  return result;
}
export function createInput(body) {
  object(body, ['cliente', 'equipamentos', 'dataEntrada', 'dataPrevista', 'tecnico', 'observacoes'], 'body');
  object(body.cliente, ['nome', 'telefone', 'email'], 'cliente');
  const cliente = {
    nome: string(body.cliente.nome, 120, 'cliente.nome', true),
    telefone: string(body.cliente.telefone, 32, 'cliente.telefone', true),
    email: string(body.cliente.email, 254, 'cliente.email'),
  };
  if (!/\d/.test(cliente.telefone)) invalid('cliente.telefone');
  if (cliente.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) invalid('cliente.email');
  if (!Array.isArray(body.equipamentos) || body.equipamentos.length < 1 || body.equipamentos.length > 100) invalid('equipamentos');
  const equipamentos = body.equipamentos.map((item, i) => {
    const path = `equipamentos.${i}`;
    object(item, ['nome', 'marca', 'modelo', 'numeroSerie', 'solicitacao'], path);
    object(item.solicitacao, ['tipo', 'descricao'], `${path}.solicitacao`);
    const tipo = item.solicitacao.tipo;
    if (!['relato', 'testar'].includes(tipo)) invalid(`${path}.solicitacao.tipo`);
    const descricao = string(item.solicitacao.descricao, 2000, `${path}.solicitacao.descricao`, tipo === 'relato');
    if (tipo === 'testar' && descricao !== null) invalid(`${path}.solicitacao.descricao`);
    return { nome: string(item.nome, 160, `${path}.nome`, true), marca: string(item.marca, 120, `${path}.marca`),
      modelo: string(item.modelo, 120, `${path}.modelo`), numeroSerie: string(item.numeroSerie, 120, `${path}.numeroSerie`),
      solicitacao: { tipo, descricao } };
  });
  return { cliente, equipamentos, dataEntrada: date(body.dataEntrada, 'dataEntrada', true),
    dataPrevista: date(body.dataPrevista, 'dataPrevista'), tecnico: string(body.tecnico, 120, 'tecnico'),
    observacoes: string(body.observacoes, 5000, 'observacoes') };
}
export function creationKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) invalid('Idempotency-Key');
  return value;
}
export function validId(id) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new OrderError(400, 'INVALID_ID');
  return id;
}
