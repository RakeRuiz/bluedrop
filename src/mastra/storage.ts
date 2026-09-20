import { Pool } from 'pg';
import { PostgresStore } from '@mastra/pg';
import { LibSQLStore } from '@mastra/libsql';
import type { MastraCompositeStore } from '@mastra/core/storage';

const connectionString = process.env.DATABASE_URL;

// Si DATABASE_URL apunta a un host inalcanzable (mal configurado, en otra red,
// etc.), el pool de `pg` intenta conectarse indefinidamente sin este límite —
// y como el webhook de Zernio procesa la respuesta de Franco en segundo plano
// (ver comentario en mastra/index.ts), esa conexión colgada nunca lanza un
// error visible: el cliente simplemente nunca recibe respuesta y no queda
// ningún log. Con un timeout explícito, una base inalcanzable falla rápido y
// cae en el manejo de errores normal (markLeadError + alerta de Telegram) en
// vez de colgarse en silencio para siempre.
const POSTGRES_CONNECTION_TIMEOUT_MS = 5000;

/**
 * En desarrollo local usamos un archivo libSQL (no requiere exponer el Postgres
 * de Supabase a internet). En producción, una vez el contenedor de Bluedrop
 * corre en el mismo VPS/red interna que Supabase, DATABASE_URL apunta al Postgres real.
 */
export const postgresStorage: MastraCompositeStore =
  connectionString && connectionString.startsWith('postgres')
    ? new PostgresStore({
        id: 'mastra-storage',
        pool: new Pool({ connectionString, connectionTimeoutMillis: POSTGRES_CONNECTION_TIMEOUT_MS }),
      })
    : new LibSQLStore({ id: 'mastra-storage', url: connectionString || 'file:./mastra-local.db' });
