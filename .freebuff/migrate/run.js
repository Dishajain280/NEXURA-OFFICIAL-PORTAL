/* Migration runner: node run.js <path-to-sql-file>
 * Reads DATABASE_URL from ../Nexura-Portal/.env and executes the SQL file. */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv(file) {
  const out = {};
  const txt = fs.readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) throw new Error("usage: node run.js <sql-file>");
  const env = loadEnv(path.join(__dirname, "..", "..", "Nexura-Portal", ".env"));
  const connectionString = env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not found in .env");

  const sql = fs.readFileSync(sqlFile, "utf8");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected. Executing", sqlFile);
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("OK — migration applied.");
  } catch (err) {
    try {
      await client.query("rollback");
    } catch (_) {
      /* noop */
    }
    console.error("MIGRATION FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
