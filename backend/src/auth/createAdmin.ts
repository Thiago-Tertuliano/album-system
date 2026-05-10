import process from 'node:process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import 'dotenv/config';
import * as schema from '../db/schema.js';
import { adminUsers } from '../db/schema.js';
import { hashPassword } from './password.js';

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function readPositionalArgs(): { email?: string; password?: string } {
  const args = process.argv.slice(2);
  const positional = args.filter((arg, index) => {
    const previous = args[index - 1];
    return !arg.startsWith('--') && previous !== '--email' && previous !== '--password';
  });
  return { email: positional[0], password: positional[1] };
}

function firstNonBlank(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => {
    const normalized = value?.trim();
    return normalized && normalized !== 'true' && normalized !== 'false';
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const positional = readPositionalArgs();
  const email = firstNonBlank(
    readArg('--email') ??
      undefined,
    positional.email,
    process.env.ADMIN_EMAIL,
    process.env.npm_config_email
  )
    ?.trim()
    .toLowerCase();
  const password = firstNonBlank(
    readArg('--password') ??
      undefined,
    positional.password,
    process.env.ADMIN_PASSWORD,
    process.env.npm_config_password
  );

  if (!databaseUrl) throw new Error('DATABASE_URL obrigatorio.');
  if (!email) throw new Error('Informe --email, ADMIN_EMAIL ou o email como argumento posicional.');
  if (!password || password.length < 8) {
    throw new Error('Informe --password, ADMIN_PASSWORD ou senha posicional com ao menos 8 caracteres.');
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  try {
    const passwordHash = await hashPassword(password);
    const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));

    if (existing[0]) {
      await db
        .update(adminUsers)
        .set({ passwordHash, active: true, updatedAt: sql`now()` })
        .where(eq(adminUsers.email, email));
      console.log(`Admin atualizado: ${email}`);
      return;
    }

    await db.insert(adminUsers).values({ email, passwordHash });
    console.log(`Admin criado: ${email}`);
  } finally {
    await client.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
