import process from 'node:process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import 'dotenv/config';
import * as schema from '../db/schema.js';
import { users } from '../db/schema.js';
import { hashPassword } from './password.js';

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = readArg('--email')?.trim().toLowerCase();
  const password = readArg('--password');
  const displayName = readArg('--name');

  if (!databaseUrl) throw new Error('DATABASE_URL obrigatório.');
  if (!email) throw new Error('Informe --email.');
  if (!password || password.length < 8) {
    throw new Error('Informe --password com ao menos 8 caracteres.');
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  try {
    const passwordHash = await hashPassword(password);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    if (existing[0]) {
      await db
        .update(users)
        .set({
          passwordHash,
          active: true,
          displayName: displayName ?? undefined,
          updatedAt: sql`now()`,
        })
        .where(eq(users.email, email));
      console.log(`Colecionador atualizado: ${email}`);
      return;
    }

    await db.insert(users).values({
      email,
      passwordHash,
      displayName: displayName ?? null,
    });
    console.log(`Colecionador criado: ${email}`);
  } finally {
    await client.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
