import 'dotenv/config';

export const Config = {
  PORT: transformToNumber(process.env.PORT) ?? 3000,
  DOMAIN: process.env.DOMAIN,
  LOG_DIR: process.env.LOG_DIR,
  SKIP_VALIDATION: transformToBoolean(process.env.SKIP_VALIDATION),
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
