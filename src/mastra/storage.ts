import { PostgresStore } from '@mastra/pg';
import { LibSQLStore } from '@mastra/libsql';
import type { MastraCompositeStore } from '@mastra/core/storage';

const connectionString = process.env.DATABASE_URL;

/**
 * En desarrollo local usamos un archivo libSQL (no requiere exponer el Postgres
 * de Supabase a internet). En producción, una vez el contenedor de Bluedrop
 * corre en el mismo VPS/red interna que Supabase, DATABASE_URL apunta al Postgres real.
 */
export const postgresStorage: MastraCompositeStore =
  connectionString && connectionString.startsWith('postgres')
    ? new PostgresStore({ id: 'mastra-storage', connectionString })
    : new LibSQLStore({ id: 'mastra-storage', url: connectionString || 'file:./mastra-local.db' });
