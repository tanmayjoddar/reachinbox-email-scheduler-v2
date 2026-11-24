import { pool } from '../db/pool';
import { signToken } from '../utils/jwt';

async function main() {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, name) VALUES ('dev', 'dev@example.com', 'Dev User')
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const token = signToken(rows[0].id);
  console.log(token);
  console.log(`-H "Cookie: token=${token}"`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
