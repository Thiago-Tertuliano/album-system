import type { SQL } from 'drizzle-orm';
import { eq, or } from 'drizzle-orm';
import { editions } from '../db/schema.js';

/** Evita comparar slug textual à coluna uuid (`22P02` no Postgres). */
export function editionSlugOrIdWhere(idOrSlug: string): SQL {
  const trimmed = idOrSlug.trim();
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (uuidLike) {
    return or(eq(editions.slug, trimmed), eq(editions.id, trimmed))!;
  }
  return eq(editions.slug, trimmed);
}
