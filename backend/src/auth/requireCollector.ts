import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from './jwt.js';
import { verifyCollectorToken } from './jwt.js';

export function getBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function getCollectorFromRequest(
  req: FastifyRequest,
  jwtSecret: string
): JwtPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyCollectorToken(token, jwtSecret);
}

export async function requireCollector(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string
): Promise<JwtPayload | null> {
  const payload = getCollectorFromRequest(req, jwtSecret);
  if (!payload) {
    await reply.code(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Autenticação de colecionador necessária.' },
    });
    return null;
  }
  return payload;
}
