import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';
import * as schema from '../db/schema.js';
import { replaceEditionCatalog } from './catalogUpsert.js';
import { parseLastStickerMarkdown } from './parseLastStickerMarkdown.js';
import { resolveLastStickerCardsNumericId } from '../lib/lastStickerCardImages.js';

async function cmdLastStickerMd(
  filePath: string,
  meta: {
    slug: string;
    name: string;
    year: number;
    hostCountry?: string;
  }
) {
  const raw = await fs.readFile(filePath, 'utf8');
  const stickers = parseLastStickerMarkdown(raw);
  if (stickers.length === 0) {
    console.error('Nenhuma figurinha parseada — verifique o formato Markdown.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL obrigatório');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });
  try {
    const sampleUrl = stickers.find((s) => s.sourceUrl?.includes('laststicker.com/cards/'))?.sourceUrl;
    const { numericId: lsCollectionId, albumSlug: lsAlbumSlug } =
      await resolveLastStickerCardsNumericId(sampleUrl);

    if (lsCollectionId != null) {
      console.log(
        `LastSticker — coleção numérica=${lsCollectionId}${lsAlbumSlug ? ` (álbum ${lsAlbumSlug})` : ''} — thumbs via proxy na API`
      );
    } else {
      console.warn(
        'LastSticker — não foi possível obter ID da coleção (Microlink/offline). Sem STICKER_IMAGE_URL_TEMPLATE as imagens podem ficar vazias.'
      );
    }

    const result = await db.transaction((tx) =>
      replaceEditionCatalog(
        tx,
        {
          slug: meta.slug,
          name: meta.name,
          year: meta.year,
          hostCountry: meta.hostCountry ?? '—',
          publisher: 'Panini',
          status: 'published',
          collectorNotes: {
            checklist_note:
              'Importado de snapshot LastSticker (Markdown). Conferir versão regional do álbum (682 vs 670 vs atualizações).',
            snapshot_file: path.basename(filePath),
          },
          lastStickerCardsNumericCollectionId: lsCollectionId,
          lastStickerAlbumSlug: lsAlbumSlug,
        },
        stickers,
        { sourceTag: 'laststicker-markdown' }
      )
    );

    console.log(
      `Import OK — slug=${meta.slug} figurinhas=${result.stickersInserted} páginas(seções)=derivadas automaticamente`
    );
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

function usage() {
  console.log(`
Uso (recomendado no Windows — npm pode “comer” flags --slug/--name):

  npx tsx src/import/cli.ts laststicker-md <arquivo.md> <slug> "<nome>" [ano] [país-sede]

Ou com flags (se chegarem ao Node sem interferência do npm):

  npx tsx src/import/cli.ts laststicker-md <arquivo.md> --slug <slug> --name "<nome>" [--year 2018] [--host "Rússia"]

PowerShell / npm run:
  npm run import:laststicker-md -- ./data/snapshots/laststicker-panini-fifa-world-cup-2018.md fwc-2018-int "Copa 2018 (LastSticker)" 2018 "Rússia"

Obs.: DATABASE_URL no arquivo .env (copie de .env.example). Na importação há chamada ao Microlink (rede); na API as thumbs LastSticker usam proxy images.weserv.nl por padrão.
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2 || argv[0] === '-h' || argv[0] === '--help') {
    usage();
    process.exit(argv[0] === '-h' || argv[0] === '--help' ? 0 : 1);
  }

  const cmd = argv[0];
  if (cmd !== 'laststicker-md') {
    console.error('Comando desconhecido:', cmd);
    usage();
    process.exit(1);
  }

  const filePath = path.resolve(argv[1]);
  const rest = argv.slice(2);
  const getOpt = (flag: string) => {
    const i = rest.indexOf(flag);
    if (i === -1 || i + 1 >= rest.length) return undefined;
    return rest[i + 1];
  };

  let slug = getOpt('--slug');
  let name = getOpt('--name');
  let yearStr = getOpt('--year');
  let host = getOpt('--host');

  /* npm no Windows às vezes remove --slug/--name antes do script; modo posicional resolve. */
  if (!slug || !name) {
    const pos = rest.filter((a) => !a.startsWith('--'));
    if (pos.length >= 2) {
      slug = pos[0];
      const last = pos[pos.length - 1];
      const prev = pos[pos.length - 2];
      /* slug + várias palavras de nome + ano (AAAA) + país — quando aspas somem no npm */
      if (pos.length >= 4 && /^\d{4}$/.test(prev)) {
        yearStr = prev;
        host = last;
        name = pos.slice(1, -2).join(' ');
      } else if (pos.length >= 3 && /^\d{4}$/.test(last)) {
        yearStr = last;
        name = pos.slice(1, -1).join(' ');
      } else if (pos.length >= 4 && /^\d{4}$/.test(pos[2] ?? '')) {
        /* slug + nome (uma palavra) + ano + país */
        name = pos[1]!;
        yearStr = pos[2];
        host = pos[3];
      } else {
        name = pos.slice(1).join(' ');
      }
    }
  }

  if (!slug || !name) {
    console.error('Informe slug e nome: flags --slug/--name ou argumentos posicionais após o arquivo.');
    usage();
    process.exit(1);
  }

  const year = yearStr ? Number(yearStr) : 2018;
  await cmdLastStickerMd(filePath, { slug, name, year, hostCountry: host });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
