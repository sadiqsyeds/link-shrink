/**
 * lib/db.ts
 * Singleton MySQL connection pool.
 * Creates one pool for the lifetime of the server process — never one
 * connection per request.
 */

import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

// Reuse pool across hot-reloads in development
export const pool: mysql.Pool =
  globalForDb.pool ?? (globalForDb.pool = createPool());
