import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import { sql } from 'drizzle-orm';

export let db: ReturnType<typeof drizzle>;

// Create a query builder with proper relations
export const createQueryBuilder = () => {
  return drizzle(db, {
    schema: {
      users,
      accounts,
      proxies,
      campaigns,
      leads,
      messages,
      action_logs,
      notifications,
      selector_registry,
      message_templates,
    },
  });
};

export const initializeDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(process.env.DATABASE_URL);
  db = drizzle(client, { schema });
  
  console.log('✅ Database connection established');
  return db;
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    await database.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

export { schema };