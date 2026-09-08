/* Read-only verification of the migration. */
const path = require("path");
const { Client } = require("pg");

function loadEnv(file) {
  const out = {};
  const txt = require("fs").readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const env = loadEnv(path.join(__dirname, "..", "..", "Nexura-Portal", ".env"));
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const q = async (label, sql) => {
    const { rows } = await client.query(sql);
    console.log("##", label);
    console.log(JSON.stringify(rows, null, 1));
  };
  await q(
    "submissions columns",
    `select column_name, data_type, is_nullable, column_default
     from information_schema.columns
     where table_schema='public' and table_name='submissions' order by ordinal_position`,
  );
  await q(
    "notifications table + policies",
    `select tablename, policyname, cmd from pg_policies
     where schemaname='public' and tablename='notifications'`,
  );
  await q(
    "submission trigger present",
    `select tgname from pg_trigger where tgrelid='public.submissions'::regclass and not tgisinternal`,
  );
  await q(
    "realtime publication tables",
    `select p.pubname, t.relname from pg_publication p
     join pg_publication_rel r on r.prpubid = p.oid
     join pg_class t on t.oid = r.prrelid where p.pubname='supabase_realtime'`,
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
