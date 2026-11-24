import { pool } from '../db/pool';
import { signToken } from '../utils/jwt';

async function main() {
  const email = process.argv[2] ?? 'dev@example.com';
  const googleId = process.argv[2] ? `dev:${email}` : 'dev';
  const name = process.argv[2] ? email : 'Dev User';
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [googleId, email, name],
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
