import { Pool } from "pg";

declare global {
  var __jbpixsPool: Pool | undefined;
}

/**
 * O pool é criado só na primeira consulta, nunca ao importar o módulo: durante
 * o build o Next carrega as páginas para coletar metadados, e aí ainda não há
 * DATABASE_URL. Criar na importação faria o build inteiro falhar.
 *
 * O cache global existe porque em desenvolvimento o Next recarrega os módulos
 * a cada alteração; sem ele abriríamos um pool novo por reload até estourar o
 * limite de conexões do Neon.
 */
function getPool(): Pool {
  if (global.__jbpixsPool) return global.__jbpixsPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env.local e cole a string de conexão do Neon."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 5,
  });
  global.__jbpixsPool = pool;
  return pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(text, params as never[]);
  return result.rows as T[];
}

export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
