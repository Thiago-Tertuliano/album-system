import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { createToken } from '../../auth/jwt.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
  display_name: z.string().trim().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

export type CollectorAuthRoutesOpts = {
  jwtSecret: string;
  jwtExpiresInSeconds: number;
};

export const collectorAuthRoutes = (
  db: Db,
  opts: CollectorAuthRoutesOpts
): FastifyPluginAsync => {
  return async (app) => {
    app.post<{ Body: unknown }>('/auth/register', async (req, reply) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Dados de cadastro inválidos.',
            fields: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);

      if (existing.length) {
        return reply.code(409).send({
          error: { code: 'CONFLICT', message: 'Email já cadastrado.' },
        });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      const [created] = await db
        .insert(users)
        .values({
          email: parsed.data.email,
          passwordHash,
          displayName: parsed.data.display_name ?? null,
        })
        .returning({
          id: users.id,
          email: users.email,
          display_name: users.displayName,
        });

      const token = createToken(
        { sub: created.id, email: created.email, role: 'collector' },
        opts.jwtSecret,
        opts.jwtExpiresInSeconds
      );

      return reply.code(201).send({
        token,
        expires_in: opts.jwtExpiresInSeconds,
        user: {
          id: created.id,
          email: created.email,
          display_name: created.display_name,
        },
      });
    });

    app.post<{ Body: unknown }>('/auth/collector/login', async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: { code: 'BAD_REQUEST', message: 'Credenciais inválidas.' },
        });
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          display_name: users.displayName,
          active: users.active,
        })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);

      if (!user?.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Email ou senha inválidos.' },
        });
      }

      const token = createToken(
        { sub: user.id, email: user.email, role: 'collector' },
        opts.jwtSecret,
        opts.jwtExpiresInSeconds
      );

      return reply.send({
        token,
        expires_in: opts.jwtExpiresInSeconds,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
        },
      });
    });
  };
};
