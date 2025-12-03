import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

let pool: sql.ConnectionPool | null = null;

// Azure SQL / Fabric SQL 用のスコープ
const SQL_SCOPE = "https://database.windows.net/.default";

// SWA のマネージド ID またはローカルのログイン情報を使う
const credential = new DefaultAzureCredential();

async function getToken(): Promise<string> {
  const tokenResponse = await credential.getToken(SQL_SCOPE);
  if (!tokenResponse?.token) {
    throw new Error("Failed to acquire access token for SQL");
  }
  return tokenResponse.token;
}

async function getConfig(): Promise<sql.config> {
  const server = process.env.FABRIC_SQL_SERVER;
  const database = process.env.FABRIC_DATABASE;

  if (!server || !database) {
    throw new Error("FABRIC_SQL_SERVER / FABRIC_DATABASE are not set");
  }

  const accessToken = await getToken();

  return {
    server,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: true
    },
    // mssql / tedious の AAD アクセストークン認証
    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token: accessToken
      }
    }
  } as any; // authentication の型が少しゆるいので any キャスト
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config = await getConfig();
  pool = new sql.ConnectionPool(config);
  pool.on("error", (err: Error) => {
    console.error("SQL pool error", err);
  });
  await pool.connect();
  return pool;
}

export const sqlTypes = sql;
