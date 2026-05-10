import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { loadEnv } from './env.js';
import { createDb } from './db/client.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/v1/auth.js';
import { editionsRoutes } from './routes/v1/editions.js';
import { adminRoutes } from './routes/v1/admin.js';

function stickerImageProxyTemplate(raw: string | undefined): string | undefined {
  if (raw === '') return undefined;
  return raw ?? 'https://images.weserv.nl/?url={url}&w=420&output=jpg';
}

async function main() {
  const env = loadEnv();
  const db = createDb(env.DATABASE_URL);

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/static/',
    decorateReply: false,
  });

  await app.register(healthRoutes);
  await app.register(
    authRoutes(db, {
      jwtSecret: env.JWT_SECRET,
      jwtExpiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
    }),
    { prefix: '/v1' }
  );
  await app.register(
    editionsRoutes(db, {
      stickerImageUrlTemplate: env.STICKER_IMAGE_URL_TEMPLATE,
      stickerImageProxyTemplate: stickerImageProxyTemplate(env.STICKER_IMAGE_PROXY_TEMPLATE),
    }),
    { prefix: '/v1' }
  );
  await app.register(adminRoutes(db, { jwtSecret: env.JWT_SECRET }), { prefix: '/v1/admin' });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
