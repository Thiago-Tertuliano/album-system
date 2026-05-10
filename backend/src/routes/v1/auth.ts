import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { adminUsers } from '../../db/schema.js';
import { createAdminToken } from '../../auth/jwt.js';
import { verifyPassword } from '../../auth/password.js';

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export type AuthRoutesOpts = {
  jwtSecret: string;
  jwtExpiresInSeconds: number;
};

export const authRoutes = (db: Db, opts: AuthRoutesOpts): FastifyPluginAsync => {
  return async (app) => {
    app.post<{ Body: unknown }>('/auth/login', async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: { code: 'BAD_REQUEST', message: 'Credenciais invalidas.' },
        });
      }

      const [admin] = await db
        .select({
          id: adminUsers.id,
          email: adminUsers.email,
          passwordHash: adminUsers.passwordHash,
          role: adminUsers.role,
          active: adminUsers.active,
        })
        .from(adminUsers)
        .where(eq(adminUsers.email, parsed.data.email))
        .limit(1);

      if (!admin?.active || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Email ou senha invalidos.' },
        });
      }

      const token = createAdminToken(
        { sub: admin.id, email: admin.email, role: admin.role },
        opts.jwtSecret,
        opts.jwtExpiresInSeconds
      );

      return reply.send({
        token,
        expires_in: opts.jwtExpiresInSeconds,
        admin: { id: admin.id, email: admin.email, role: admin.role },
      });
    });
  };
};
