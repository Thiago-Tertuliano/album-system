/**
 * Copia owned/duplicate_count de sticker_slots para user_sticker_progress
 * do usuário indicado (ou primeiro usuário ativo).
 *
 * Uso: npx tsx src/db/migrateLegacyProgress.ts [--email user@example.com]
 */
import 'dotenv/config';
import { eq, and, or, sql } from 'drizzle-orm';
import { createDb } from './client.js';
import { stickerSlots, users, userStickerProgress } from './schema.js';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL não definido.');
    process.exit(1);
  }

  const emailArg = process.argv.find((a) => a.includes('@'));
  const db = createDb(url);

  let userId: string | undefined;
  if (emailArg) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailArg.trim().toLowerCase()))
      .limit(1);
    userId = u?.id;
    if (!userId) {
      console.error(`Usuário não encontrado: ${emailArg}`);
      process.exit(1);
    }
  } else {
    const [u] = await db.select({ id: users.id }).from(users).limit(1);
    userId = u?.id;
    if (!userId) {
      console.error('Nenhum usuário em users. Crie um com npm run collector:create');
      process.exit(1);
    }
  }

  const legacy = await db
    .select({
      slotId: stickerSlots.id,
      owned: stickerSlots.owned,
      duplicateCount: stickerSlots.duplicateCount,
    })
    .from(stickerSlots)
    .where(or(eq(stickerSlots.owned, true), sql`${stickerSlots.duplicateCount} > 0`));

  let upserted = 0;
  for (const row of legacy) {
    await db
      .insert(userStickerProgress)
      .values({
        userId,
        stickerSlotId: row.slotId,
        owned: row.owned,
        duplicateCount: row.duplicateCount,
      })
      .onConflictDoUpdate({
        target: [userStickerProgress.userId, userStickerProgress.stickerSlotId],
        set: {
          owned: row.owned,
          duplicateCount: row.duplicateCount,
          updatedAt: sql`now()`,
        },
      });
    upserted += 1;
  }

  console.log(`Migrados ${upserted} slots com progresso legado para user ${userId}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
