import 'dotenv/config';

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required in the backend environment`);
  }
  return value;
}

export function requiredPositiveNumber(name) {
  const value = Number(requiredEnv(name));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

export function requiredPositiveInteger(name) {
  const value = requiredPositiveNumber(name);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}
