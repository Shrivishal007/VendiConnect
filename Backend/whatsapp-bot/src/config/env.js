import 'dotenv/config';

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required in the WhatsApp bot environment`);
  }
  return value;
}

export function requiredPort(name) {
  const port = Number(requiredEnv(name));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

export function requiredBoolean(name) {
  const value = requiredEnv(name).toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new Error(`${name} must be either true or false`);
  }
  return value === 'true';
}
