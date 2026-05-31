/**
 * Job único: baixa thumbs (via proxy), grava em public/stickers/<slug>/*.jpg
 * e persiste URL em sticker_slots.image_url — o GET só lê o banco.
 *
 *   npm run job:cache-sticker-images -- --edition fwc-2018-int
 *   npm run job:cache-sticker-images -- --edition fwc-2018-int --force --dry-run
 *
 * Env: STICKER_PUBLIC_BASE_URL (default http://127.0.0.1:${PORT}), STICKER_IMAGE_PROXY_TEMPLATE
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, asc } from 'drizzle-orm';
import 'dotenv/config';
import * as schema from '../db/schema.js';
import { editions, stickerSlots } from '../db/schema.js';
import { loadEnv } from '../env.js';
import { inferLastStickerCardsNumericId } from '../lib/lastStickerCardImages.js';
import { lastStickerCardThumbUrl, applyStickerImageProxy } from '../util/stickerThumbUrls.js';

const MIN_IMAGE_BYTES = 400;

function stickerImageProxyTemplate(raw: string | undefined): string | undefined {
  if (raw === '') return undefined;
  return raw ?? 'https://images.weserv.nl/?url={url}&w=420&output=jpg';
}

function safeStickerFilename(albumLabel: string): string {
  const s = albumLabel.trim();
  if (!s) return '_empty';
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let editionSlug: string | undefined;
  let force = false;
  let dryRun = false;
  let delayMs = 85;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--edition' || a === '--slug') {
      editionSlug = argv[++i];
      continue;
    }
    if (a === '--force') {
      force = true;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--delay-ms') {
      delayMs = Math.max(0, Number(argv[++i]) || 85);
      continue;
    }
    if (a === '-h' || a === '--help') {
      console.log(`
  npm run job:cache-sticker-images -- --edition <slug>
  npm run job:cache-sticker-images -- --edition <slug> --force
  npm run job:cache-sticker-images -- --dry-run --edition <slug>
  (sem --edition: todas edições status=published)
`);
      process.exit(0);
    }
  }
  return { editionSlug, force, dryRun, delayMs };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function isCachedStaticUrl(url: string | null | undefined, slug: string): boolean {
  if (!url) return false;
  return url.includes(`/static/stickers/${slug}/`);
}

function isStandardAlbumLabel(albumLabel: string): boolean {
  const label = albumLabel.trim();
  if (!label) return false;
  if (label.includes('-')) return false;
  if (/x$/i.test(label)) return false;

  return (
    /^\d{1,4}$/.test(label) ||
    /^00$/i.test(label) ||
    /^E\d{1,4}$/i.test(label) ||
    /^CB\d{1,4}$/i.test(label) ||
    /^FWC\d{1,3}$/i.test(label) ||
    /^[A-Z]{3}\d{1,2}$/i.test(label)
  );
}

function isStandardSticker(metadata: Record<string, unknown> | null, albumLabel: string): boolean {
  const type = String(metadata?.sticker_type ?? '').toLowerCase();
  const isBaseType = type === '-' || type === 'foil' || type === 'metal';
  return isBaseType && isStandardAlbumLabel(albumLabel);
}

export type CacheStickerImagesJobOptions = {
  editionSlug?: string;
  force?: boolean;
  dryRun?: boolean;
  delayMs?: number;
  includeExtraSets?: boolean;
  cleanBeforeRun?: boolean;
};

export type CacheStickerImagesJobResult = {
  ok: number;
  skip: number;
  fail: number;
  dryRun: boolean;
};

export async function runCacheStickerImagesJob(
  options: CacheStickerImagesJobOptions = {}
): Promise<CacheStickerImagesJobResult> {
  const {
    editionSlug,
    force = false,
    dryRun = false,
    delayMs = 85,
    includeExtraSets = false,
    cleanBeforeRun = true,
  } = options;
  const env = loadEnv();
  const proxyTpl = stickerImageProxyTemplate(env.STICKER_IMAGE_PROXY_TEMPLATE);
  if (!proxyTpl) {
    throw new Error('STICKER_IMAGE_PROXY_TEMPLATE vazio — remova do .env para usar default ou defina um proxy.');
  }

  const publicBase = (env.STICKER_PUBLIC_BASE_URL ?? `http://127.0.0.1:${env.PORT}`).replace(/\/$/, '');
  const publicRoot = path.join(process.cwd(), 'public');

  const sql = postgres(env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  try {
    const editionRows = editionSlug
      ? await db.select().from(editions).where(eq(editions.slug, editionSlug))
      : await db.select().from(editions).where(eq(editions.status, 'published'));

    if (editionSlug && editionRows.length === 0) {
      throw new Error(`Edição não encontrada: ${editionSlug}`);
    }

    let totalOk = 0;
    let totalSkip = 0;
    let totalFail = 0;

    for (const edition of editionRows) {
      const allStickers = await db
        .select()
        .from(stickerSlots)
        .where(eq(stickerSlots.editionId, edition.id))
        .orderBy(asc(stickerSlots.sortIndex));
      const stickers = includeExtraSets
        ? allStickers
        : allStickers.filter((s) =>
            isStandardSticker(s.metadata as Record<string, unknown> | null, s.albumLabel)
          );

      const nid = inferLastStickerCardsNumericId(
        edition.collectorNotes,
        allStickers.slice(0, 120).map((s) => ({ metadata: s.metadata }))
      );

      if (nid == null) {
        console.warn(`[${edition.slug}] Sem ID LastSticker — pulando.`);
        continue;
      }

      const dir = path.join(publicRoot, 'stickers', edition.slug);
      if (!dryRun) {
        if (cleanBeforeRun) await fs.rm(dir, { recursive: true, force: true });
        await fs.mkdir(dir, { recursive: true });
      }

      console.log(`\n=== ${edition.slug} (${stickers.length} slots, coleção=${nid}) ===`);

      for (const row of stickers) {
        const fname = `${safeStickerFilename(row.albumLabel)}.jpg`;
        const diskPath = path.join(dir, fname);
        const publicUrl = `${publicBase}/static/stickers/${edition.slug}/${fname}`;

        if (!force && row.imageUrl && isCachedStaticUrl(row.imageUrl, edition.slug)) {
          try {
            await fs.access(diskPath);
            totalSkip++;
            continue;
          } catch {
            /* baixar de novo */
          }
        }

        const fetchUrl = applyStickerImageProxy(proxyTpl, lastStickerCardThumbUrl(nid, row.albumLabel));

        if (dryRun) {
          console.log(`[dry-run] ${row.albumLabel}`);
          continue;
        }

        try {
          const res = await fetch(fetchUrl, {
            headers: { Accept: 'image/*' },
            signal: AbortSignal.timeout(45_000),
          });
          if (!res.ok) {
            console.error(`FAIL ${row.albumLabel} HTTP ${res.status}`);
            totalFail++;
            await sleep(delayMs);
            continue;
          }
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < MIN_IMAGE_BYTES) {
            console.warn(`SKIP ${row.albumLabel} (${buf.length}b)`);
            totalFail++;
            await sleep(delayMs);
            continue;
          }

          await fs.writeFile(diskPath, buf);
          await db
            .update(stickerSlots)
            .set({ imageUrl: publicUrl, updatedAt: new Date() })
            .where(eq(stickerSlots.id, row.id));

          totalOk++;
          if (totalOk % 50 === 0) console.log(`… ${totalOk} gravadas`);
        } catch (e) {
          console.error(`FAIL ${row.albumLabel}`, e instanceof Error ? e.message : e);
          totalFail++;
        }

        await sleep(delayMs);
      }
    }

    console.log(`\nResumo: ok=${totalOk} skip=${totalSkip} fail=${totalFail}${dryRun ? ' (dry-run)' : ''}`);
    return { ok: totalOk, skip: totalSkip, fail: totalFail, dryRun };
  } finally {
    await sql.end({ timeout: 10 }).catch(() => {});
  }
}

async function main() {
  const result = await runCacheStickerImagesJob(parseArgs());
  if (result.fail > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
