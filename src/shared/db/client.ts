import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { serverEnv } from "@/shared/config/env.server"

// Explicit pool options: pg's default connectionTimeoutMillis (0) waits forever (drizzle-postgres.md, rule 4).
const POOL_MAX_CONNECTIONS = 10
const POOL_IDLE_TIMEOUT_MS = 10_000
const POOL_CONNECTION_TIMEOUT_MS = 5_000

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  max: POOL_MAX_CONNECTIONS,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
})

export const db = drizzle({ client: pool })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
export type DbOrTx = Db | Tx
