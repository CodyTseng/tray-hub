import 'dotenv/config';

export const Config = {
  PORT: transformToNumber(process.env.PORT) ?? 3000,
  PASSWORD: process.env.PASSWORD,
  DOMAIN: process.env.DOMAIN,
  LOG_DIR: process.env.LOG_DIR,
  MAX_CONNECTIONS: transformToNumber(process.env.MAX_CONNECTIONS) ?? 20,
  TRUST_RELAY: transformToBoolean(process.env.TRUST_RELAY),
  PUBKEY: process.env.PUBKEY,
  CONTACT: process.env.CONTACT,
};

function transformToNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = parseInt(value, 10);
  if (isNaN(n)) {
    return undefined;
  }
  return n;
}

function transformToBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === 'true';
}
