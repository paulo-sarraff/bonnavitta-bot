import sql, { ConnectionPool, config as sqlConfig } from 'mssql';
import config from './index.js';
import logger from '../utils/logger.js';

let pool: ConnectionPool | null = null;

export async function initializeDatabase(): Promise<ConnectionPool> {
  if (pool && pool.connected) {
    logger.info('Database pool already connected');
    return pool;
  }

  try {
    const sqlServerConfig: sqlConfig = {
      server: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      options: config.database.options,
      pool: config.database.pool,
    };

    pool = new sql.ConnectionPool(sqlServerConfig);

    pool.on('error', (err) => {
      logger.error('Database pool error:', err);
      pool = null;
    });

    await pool.connect();
    logger.info(`Database connected: ${config.database.database}`);

    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<ConnectionPool> {
  if (!pool || !pool.connected) {
    return initializeDatabase();
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('Database connection closed');
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.request().query('SELECT 1 AS alive');
    return result.recordset.length > 0;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

export { sql };
