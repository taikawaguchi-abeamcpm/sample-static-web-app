import sql from "mssql";
import { ManagedIdentityCredential } from "@azure/identity";

let pool: sql.ConnectionPool | null = null;

// Fabric SQL / Azure SQL / Synapse / Fabric Warehouse で共通のスコープ
const SQL_SCOPE = "https://database.windows.net/.default";

const credential = new ManagedIdentityCredential();

async function getAccessToken(): Promise<string> {
  const token = await credential.getToken(SQL_SCOPE);
  if (!token?.token) {
    throw new Error("Failed to acquire access token for SQL");
  }
  return token.token;
}

async function buildConfig(): Promise<sql.config> {
  const server = process.env.FABRIC_SQL_SERVER;
  const database = process.env.FABRIC_DATABASE;

  if (!server || !database) {
    throw new Error("FABRIC_SQL_SERVER / FABRIC_DATABASE are not set");
  }

  const accessToken = await getAccessToken();

  return {
    server,
    database,
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token: accessToken,
      },
    },
  } as any;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config = await buildConfig();
  pool = new sql.ConnectionPool(config);
  pool.on("error", (err: Error) => {
    console.error("SQL pool error", err);
  });
  await pool.connect();
  return pool;
}

export const sqlTypes = sql;
