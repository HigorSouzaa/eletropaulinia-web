import { OrderError, object, validId } from './orderInput.js';

export function fail(code = 'VALIDATION_ERROR') { throw new OrderError(400, code); }
export function shape(value, keys) { object(value, keys, 'body'); }
export function cents(value) { if (!Number.isSafeInteger(value) || value < 1 || value > 999999999) fail(); return value; }
export function label(value, max = 160) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(); return value.trim(); }
export function optionalId(value) { if (value === undefined || value === null || value === '') return null; return validId(value); }
export function civil(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('INVALID_PERIOD');
  return value;
}
export function competence(value) { if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) fail(); return value; }
export function page(query) {
  const number = Number(query.page ?? 1), size = Number(query.pageSize ?? 25);
  if (!Number.isInteger(number) || number < 1 || number > 100000 || !Number.isInteger(size) || size < 1 || size > 100) fail('INVALID_PERIOD');
  return { number, size, skip: (number - 1) * size };
}
const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
function localDate(date) { const parts = Object.fromEntries(zone.formatToParts(date).map(part => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; }
export function dayStart(value) {
  civil(value);
  const utcMinute = Math.floor(Date.parse(`${value}T00:00:00Z`) / 60000);
  let low = utcMinute - 12 * 60, high = utcMinute + 36 * 60;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(new Date(middle * 60000)) < value) low = middle + 1; else high = middle;
  }
  return new Date(low * 60000);
}
export function nextDay(value) { const next = new Date(Date.parse(`${civil(value)}T00:00:00Z`) + 86400000).toISOString().slice(0, 10); return next; }
export function period(query) {
  const today = localDate(new Date());
  const from = civil(query.from ?? `${today.slice(0, 7)}-01`), to = civil(query.to ?? today);
  if (from > to) fail('INVALID_PERIOD');
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (days > 3660) fail('INVALID_PERIOD');
  return { from, to, start: dayStart(from), end: dayStart(nextDay(to)), days };
}
export function matchVersion(value, prefix, id) {
  if (!value) throw new OrderError(428, 'PRECONDITION_REQUIRED');
  const match = value.match(new RegExp(`^"${prefix}-${id}-v([1-9]\\d*)"$`));
  if (!match) throw new OrderError(412, 'VERSION_CONFLICT');
  return Number(match[1]);
}
