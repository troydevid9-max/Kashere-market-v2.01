import fs from "node:fs";
import path from "node:path";
import knexLib from "knex";
import { config } from "./config.js";
import { Client_NodeSqlite } from "./sqliteNode.js";

/** Postgres by default; SQLite is available only when explicitly enabled for tests. */
export function createDb({ file, schema } = {}) {
  if (config.databaseUrl) {
    return knexLib({
      client: "pg",
      connection: {
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false },
      },
      pool: { min: 0, max: 10 },
      ...(schema ? { searchPath: [schema] } : {}),
    });
  }
  if (config.prod || !config.allowSqlite)
    throw new Error('DATABASE_URL must be set. Set ALLOW_SQLITE=true only for local tests.')
  const filename = file ?? config.sqliteFile;
  if (filename !== ":memory:")
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  return knexLib({
    client: Client_NodeSqlite,
    connection: { filename },
    useNullAsDefault: true,
    // One connection = serialized writes. Inside a transaction always use `trx`, never `db`.
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn, done) => {
        conn.pragma("foreign_keys = ON");
        conn.pragma("journal_mode = WAL");
        done();
      },
    },
  });
}
