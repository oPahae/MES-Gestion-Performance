import mysql from "mysql2/promise";

const globalForPool = global;

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mes_performance",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

export function getPool() {
  if (process.env.NODE_ENV === "production") {
    if (!globalForPool._mesPool) {
      globalForPool._mesPool = createPool();
    }
    return globalForPool._mesPool;
  }

  if (!globalForPool._mesPool) {
    globalForPool._mesPool = createPool();
  }
  return globalForPool._mesPool;
}

export async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}