/**
 * Adds database-level triggers that block INSERT/UPDATE/DELETE on immutable tables even via raw SQL,
 * as a defense-in-depth backstop to the Payload-level immutableRecord() hooks.
 *
 * Run once after the schema exists:  npm run db:guards
 */
import { Pool } from 'pg'
import 'dotenv/config'

const IMMUTABLE_TABLES = ['wallet_transactions', 'audit_logs']

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION rw_block_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Table % is append-only and cannot be updated or deleted (attempted % on row %)', TG_TABLE_NAME, TG_OP, OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `)
    for (const table of IMMUTABLE_TABLES) {
      const exists = await client.query(`SELECT to_regclass($1) as reg`, [table])
      if (!exists.rows[0]?.reg) {
        console.log(`Skipping ${table} (table not found yet — run this again after the app has created its schema).`)
        continue
      }
      await client.query(`DROP TRIGGER IF EXISTS rw_block_update ON ${table};`)
      await client.query(`DROP TRIGGER IF EXISTS rw_block_delete ON ${table};`)
      await client.query(`CREATE TRIGGER rw_block_update BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION rw_block_mutation();`)
      await client.query(`CREATE TRIGGER rw_block_delete BEFORE DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION rw_block_mutation();`)
      console.log(`Guards applied to ${table}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
