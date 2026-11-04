import { OrderError } from './orderInput.js';

const invalid = path => { throw new OrderError(400, 'VALIDATION_ERROR', [{ path, code: 'INVALID_VALUE' }]); };
const weights = length => Array.from({ length }, (_, index) => 2 + ((length - index - 1) % 8));
const digit = base => {
  const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights(base.length)[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};
export function validCpf(value) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const first = [...value.slice(0, 9)].reduce((sum, char, index) => sum + Number(char) * (10 - index), 0);
  const a = first % 11 < 2 ? 0 : 11 - first % 11;
  const second = [...value.slice(0, 9) + a].reduce((sum, char, index) => sum + Number(char) * (11 - index), 0);
  const b = second % 11 < 2 ? 0 : 11 - second % 11;
  return value.endsWith(`${a}${b}`);
}
export function validCnpj(value) {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^(.)\1+$/.test(value.slice(0, 12))) return false;
  const a = digit(value.slice(0, 12));
  return value.endsWith(`${a}${digit(value.slice(0, 12) + a)}`);
}
export function clientIdentityInput(body, current) {
  const tipoPessoa = body.tipoPessoa === undefined ? current.tipoPessoa ?? null : body.tipoPessoa;
  if (tipoPessoa !== null && !['fisica', 'juridica'].includes(tipoPessoa)) invalid('tipoPessoa');
  let documento = body.documento === undefined ? current.documento ?? null : body.documento;
  if (documento !== null) {
    if (typeof documento !== 'string' || !/^[A-Za-z0-9./-]+$/.test(documento)) invalid('documento');
    documento = documento.replace(/[./-]/g, '').toUpperCase();
    if (!(tipoPessoa === 'fisica' && validCpf(documento) || tipoPessoa === 'juridica' && validCnpj(documento))) invalid('documento');
  }
  if (!tipoPessoa && documento) invalid('documento');
  const oldAddress = current.endereco || {};
  const change = body.endereco;
  if (change !== undefined && change !== null && (typeof change !== 'object' || Array.isArray(change))) invalid('endereco');
  const allowed = { cep: 8, logradouro: 160, numero: 20, complemento: 100, bairro: 100, cidade: 100, uf: 2 };
  if (change) for (const key of Object.keys(change)) if (!(key in allowed)) invalid(`endereco.${key}`);
  const endereco = change === null ? null : { ...oldAddress };
  if (change) for (const [key, value] of Object.entries(change)) {
    if (value !== null && (typeof value !== 'string' || !value.trim() || value.trim().length > allowed[key])) invalid(`endereco.${key}`);
    endereco[key] = typeof value === 'string' ? value.trim() : null;
  }
  if (endereco) {
    if (endereco.cep) { if (!/^\d{5}-?\d{3}$/.test(endereco.cep)) invalid('endereco.cep'); endereco.cep = endereco.cep.replace('-', ''); }
    if (endereco.uf) { endereco.uf = endereco.uf.toUpperCase(); if (!/^[A-Z]{2}$/.test(endereco.uf)) invalid('endereco.uf'); }
  }
  return { tipoPessoa, documento, endereco };
}
