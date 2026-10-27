// Pure helpers shared by Express and Next. No network or environment access.
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^\+?[\d ()-]+$/.test(value.trim())) return null;
  const text = value.trim();
  let digits = text.replace(/\D/g, '');
  if (text.startsWith('+')) {
    if (!digits.startsWith('55') || ![12, 13].includes(digits.length)) return null;
    digits = digits.slice(2);
  } else if ([12, 13].includes(digits.length) && digits.startsWith('55')) digits = digits.slice(2);
  if (!/^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digits)) return null;
  return '+55' + digits;
}

// Invalid/incomplete historic values are kept verbatim for display.
export function formatPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return typeof value === 'string' ? value : '';
  const digits = phone.slice(3);
  return `(${digits.slice(0, 2)}) ${digits.slice(2, -4)}-${digits.slice(-4)}`;
}

// Partial national input can be formatted; invalid input is never truncated or repaired.
export function formatPhoneInput(value) {
  if (normalizePhone(value)) return formatPhone(value);
  if (!/^[\d ()-]*$/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length > 11) return value;
  if (digits.length <= 2) return digits ? '(' + digits : '';
  const subscriber = digits.slice(2);
  const split = subscriber.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${subscriber.slice(0, split)}${subscriber.length > split ? '-' + subscriber.slice(split) : ''}`;
}
