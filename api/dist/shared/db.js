"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlTypes = void 0;
exports.getPool = getPool;
const mssql_1 = __importDefault(require("mssql"));
let pool = null;
function getConfig() {
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
    };
}
async function getPool() {
    if (pool) {
        if (!pool.connected) {
            await pool.connect();
        }
        return pool;
    }
    const config = getConfig();
    pool = new mssql_1.default.ConnectionPool(config);
    pool.on('error', (err) => {
        console.error('SQL pool error', err);
    });
    await pool.connect();
    return pool;
}
exports.sqlTypes = mssql_1.default;
