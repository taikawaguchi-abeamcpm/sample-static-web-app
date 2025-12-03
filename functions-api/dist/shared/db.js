"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlTypes = void 0;
exports.getPool = getPool;
const mssql_1 = __importDefault(require("mssql"));
const identity_1 = require("@azure/identity");
let pool = null;
// Azure SQL / Fabric SQL 用のスコープ
const SQL_SCOPE = "https://database.windows.net/.default";
const credential = new identity_1.DefaultAzureCredential();
async function getToken() {
    const tokenResponse = await credential.getToken(SQL_SCOPE);
    if (!tokenResponse?.token) {
        throw new Error("Failed to acquire access token for SQL");
    }
    return tokenResponse.token;
}
async function getConfig() {
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
        authentication: {
            type: "azure-active-directory-access-token",
            options: {
                token: accessToken
            }
        }
    };
}
async function getPool() {
    if (pool && pool.connected) {
        return pool;
    }
    const config = await getConfig();
    pool = new mssql_1.default.ConnectionPool(config);
    pool.on("error", (err) => {
        console.error("SQL pool error", err);
    });
    await pool.connect();
    return pool;
}
exports.sqlTypes = mssql_1.default;
