import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** Edição = uma Copa com seu álbum Panini (ou equivalente). */
export const editions = pgTable(
  'editions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    year: integer('year').notNull(),
    hostCountry: text('host_country'),
    /** Ex.: Panini — importante para auditoria do catálogo oficial */
    publisher: text('publisher').notNull().default('Panini'),
    /** Capa do álbum (URL absoluta ou path servido pelo CDN/backend estático) */
    coverImageUrl: text('cover_image_url'),
    /** Total de figurinhas conforme o checklist oficial — atualizado no seed/migration */
    stickerTotal: integer('sticker_total').notNull().default(0),
    status: text('status').notNull().default('draft'), // draft | published | archived
    /** Base para métrica de “quanto falta gastar” (centavos, ex.: pacote oficial) */
    estimatedPackPriceCents: integer('estimated_pack_price_cents'),
    /** Dicas / texto livre para colecionadores (tamanho do pacote, tiragens especiais, etc.) */
    collectorNotes: jsonb('collector_notes').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index('editions_slug_idx').on(t.slug),
    yearIdx: index('editions_year_idx').on(t.year),
  })
);

/** Página física do álbum — ajuda o usuário a ver “esta folha inteira”. */
export const albumPages = pgTable(
  'album_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    title: text('title'),
    /** Opcional: imagem da página completa do álbum para navegação visual rápida */
    previewImageUrl: text('preview_image_url'),
  },
  (t) => ({
    uniqEditionPage: uniqueIndex('album_pages_edition_page_unique').on(t.editionId, t.pageNumber),
  })
);

/**
 * Uma figurinha = uma posição oficial no checklist.
 * album_label reproduz o número/código do verso (ex.: "00", "481", "36x").
 * sort_index é a ordem absoluta no checklist importado (estável para UI/PDF).
 */
export const stickerSlots = pgTable(
  'sticker_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id').references(() => albumPages.id, { onDelete: 'set null' }),
    albumLabel: text('album_label').notNull(),
    sortIndex: integer('sort_index').notNull(),
    indexOnPage: integer('index_on_page'),
    /**
     * player | team_photo | logo | stadium | mascot | legend | foil | trophy | intro | poster | other
     * Reflete categorias comuns nos álbuns da Copa (incl. especiais / laminadas quando aplicável).
     */
    category: text('category').notNull().default('player'),
    /** Destaque UI — foil, black border, legend, etc. */
    isSpecial: boolean('is_special').notNull().default(false),
    displayName: text('display_name').notNull(),
    teamCode: text('team_code'),
    teamName: text('team_name'),
    shirtNumber: integer('shirt_number'),
    position: text('position'),
    imageUrl: text('image_url'),
    /** Controle de coleção do usuário local (sem autenticação por conta). */
    owned: boolean('owned').notNull().default(false),
    /** Quantidade de repetidas extras (não conta a unidade principal). */
    duplicateCount: integer('duplicate_count').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqEditionAlbumLabel: uniqueIndex('sticker_slots_edition_album_label_unique').on(
      t.editionId,
      t.albumLabel
    ),
    editionSortIdx: index('sticker_slots_edition_sort_idx').on(t.editionId, t.sortIndex),
    editionIdx: index('sticker_slots_edition_id_idx').on(t.editionId),
    pageIdx: index('sticker_slots_page_id_idx').on(t.pageId),
  })
);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('admin'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('admin_users_email_idx').on(t.email),
  })
);

export const editionsRelations = relations(editions, ({ many }) => ({
  pages: many(albumPages),
  stickers: many(stickerSlots),
}));

export const albumPagesRelations = relations(albumPages, ({ one, many }) => ({
  edition: one(editions, {
    fields: [albumPages.editionId],
    references: [editions.id],
  }),
  stickers: many(stickerSlots),
}));

export const stickerSlotsRelations = relations(stickerSlots, ({ one }) => ({
  edition: one(editions, {
    fields: [stickerSlots.editionId],
    references: [editions.id],
  }),
  page: one(albumPages, {
    fields: [stickerSlots.pageId],
    references: [albumPages.id],
  }),
}));
