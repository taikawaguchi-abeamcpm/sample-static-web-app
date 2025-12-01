import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

function getConfig(): sql.config {
  const server = process.env.FABRIC_SQL_SERVER;
  const database = process.env.FABRIC_DATABASE;
  const user = process.env.FABRIC_SQL_USER;
  const password = process.env.FABRIC_SQL_PASSWORD;

  if (!server || !database || !user || !password) {
    throw new Error('Database connection settings are not fully configured.');
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  } as sql.config;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) {
    if (!pool.connected) {
      await pool.connect();
    }
    return pool;
  }

  const config = getConfig();
  pool = new sql.ConnectionPool(config);
  pool.on('error', (err: Error) => {
    console.error('SQL pool error', err);
  });
  await pool.connect();
  return pool;
}

export const sqlTypes = sql;
