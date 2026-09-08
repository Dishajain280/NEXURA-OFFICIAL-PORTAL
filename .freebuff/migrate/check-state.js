/* Read-only state check after an approve action. */
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
    "submission fa9f8f70…",
    `select id, status, feedback, reviewed_at, updated_at from public.submissions`,
  );
  await q(
    "notifications",
    `select id, user_id, type, title, message, link, read, created_at from public.notifications order by created_at desc`,
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
