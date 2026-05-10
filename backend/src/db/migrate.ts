import path from 'node:path';
import process from 'node:process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import 'dotenv/config';

function isConnRefused(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; errors?: { code?: string }[] };
  if (e.code === 'ECONNREFUSED') return true;
  return Boolean(Array.isArray(e.errors) && e.errors.some((x) => x?.code === 'ECONNREFUSED'));
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Só avança quando `SELECT 1` responder — evita misturar falhas do migrator com “servidor ainda não está pronto”. */
async function waitForPostgres(url: string, maxAttempts: number, delayMs: number): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const sql = postgres(url, { max: 1, connect_timeout: 10 });
    try {
      await sql`SELECT 1`;
      await sql.end();
      if (attempt > 1) {
        console.log(`Postgres pronto após ${attempt} tentativa(s).`);
      }
      return;
    } catch (err) {
      await sql.end({ timeout: 1 }).catch(() => {});
      if (!isConnRefused(err)) {
        throw err;
      }
      if (attempt >= maxAttempts) {
        throw err;
      }
      console.log(
        `Aguardando Postgres aceitar conexões (${attempt}/${maxAttempts})… ` +
          '(subindo container — `docker compose ps` / `docker logs album-postgres`.)'
      );
      await sleep(delayMs);
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'DATABASE_URL não definido. Copie backend/.env.example para backend/.env e ajuste a URL do Postgres.'
    );
    process.exit(1);
  }

  const migrationsFolder = path.join(process.cwd(), 'drizzle');

  await waitForPostgres(url, 30, 1000);

  const sql = postgres(url, { max: 1, connect_timeout: 30 });
  try {
    console.log('Executando migrações em', migrationsFolder);
    await migrate(drizzle(sql), { migrationsFolder });
    console.log('Migrações concluídas.');
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
