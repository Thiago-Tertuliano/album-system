import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres.'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 8),
  /**
   * Opcional. Ex.: http://localhost:3333/static/stickers/{editionSlug}/{albumLabel}.jpg
   * Coloque arquivos em backend/public/stickers/<slug>/<rótulo>.jpg (rótulo = album_label).
   */
  STICKER_IMAGE_URL_TEMPLATE: z.string().optional(),
  /**
   * Proxy para thumbs externas (LastSticker). String vazia desativa.
   * Default em código usa images.weserv.nl — placeholder: {url} (destino já URL-encoded).
   */
  STICKER_IMAGE_PROXY_TEMPLATE: z.string().optional(),
  /** Base URL gravada em sticker_slots.image_url pelo job de cache (sem barra final). Ex.: http://127.0.0.1:3333 */
  STICKER_PUBLIC_BASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Variáveis de ambiente inválidas');
  }
  return parsed.data;
}
