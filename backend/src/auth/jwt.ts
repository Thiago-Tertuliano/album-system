import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
};

/** @deprecated use JwtPayload */
export type AdminJwtPayload = JwtPayload;

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createToken(
  payload: Omit<JwtPayload, 'exp'>,
  secret: string,
  expiresInSeconds: number
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: JwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const unsigned = `${encodeJson(header)}.${encodeJson(body)}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function createAdminToken(
  payload: Omit<JwtPayload, 'exp'>,
  secret: string,
  expiresInSeconds: number
): string {
  return createToken(payload, secret, expiresInSeconds);
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerRaw, payloadRaw, signature] = parts;
  const unsigned = `${headerRaw}.${payloadRaw}`;
  const expected = sign(unsigned, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const header = JSON.parse(Buffer.from(headerRaw, 'base64url').toString('utf8')) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    const payload = JSON.parse(Buffer.from(payloadRaw, 'base64url').toString('utf8')) as JwtPayload;
    if (!payload.sub || !payload.email || !payload.role || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string, secret: string): JwtPayload | null {
  const payload = verifyToken(token, secret);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export function verifyCollectorToken(token: string, secret: string): JwtPayload | null {
  const payload = verifyToken(token, secret);
  if (!payload || payload.role !== 'collector') return null;
  return payload;
}
