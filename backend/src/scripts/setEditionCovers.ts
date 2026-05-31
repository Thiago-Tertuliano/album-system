/**
 * Atualiza cover_image_url das edições MVP.
 * npx tsx src/scripts/setEditionCovers.ts
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDb } from '../db/client.js';
import { editions } from '../db/schema.js';

const COVERS: Record<string, string> = {
  'fwc-2014': '/static/covers/fwc-2014.jpg',
  'fwc-2018-int': '/static/covers/fwc-2018-int.png',
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definido');
  const db = createDb(url);

  for (const [slug, cover] of Object.entries(COVERS)) {
    const updated = await db
      .update(editions)
      .set({ coverImageUrl: cover })
      .where(eq(editions.slug, slug))
      .returning({ slug: editions.slug });
    console.log(updated.length ? `OK ${slug} -> ${cover}` : `SKIP ${slug} (não encontrada)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
