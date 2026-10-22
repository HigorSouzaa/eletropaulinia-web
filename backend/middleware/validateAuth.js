const roles = ['admin', 'tecnico', 'atendente'];

export function registrationErrors(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['body'];
  const errors = Object.keys(body).filter(key => !['username', 'password', 'name', 'role'].includes(key));
  if (typeof body.username !== 'string' || body.username.trim().length < 3 || body.username.trim().length > 100) errors.push('username');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) errors.push('name');
  if (typeof body.password !== 'string' || body.password.length < 12 || Buffer.byteLength(body.password, 'utf8') > 72) errors.push('password');
  if (body.role !== undefined && !roles.includes(body.role)) errors.push('role');
  return errors;
}

export function validateRegistration(req, res, next) {
  const fields = registrationErrors(req.body);
  if (fields.length) return res.status(400).json({ message: 'Dados de cadastro inválidos', fields });
  return next();
}

export function validateLogin(req, res, next) {
  const body = req.body;
  if (!body || typeof body.username !== 'string' || !body.username.trim() || body.username.length > 100
    || typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Informe usuário e senha válidos' });
  }
  return next();
}
