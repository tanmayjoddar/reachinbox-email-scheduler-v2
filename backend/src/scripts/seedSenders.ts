import { pool } from '../db/pool';
import { listSenders } from '../services/senders';

async function main() {
  const count = Number(process.argv[2]) || 3;
  const force = process.argv.includes('--force');
  const existing = await listSenders();

  if (existing.length && !force) {
    console.log(`senders already exist (${existing.length}); pass --force to add more`);
    return;
  }

  // Nodemailer otherwise hands back one cached account for every call.
  process.env.ETHEREAL_CACHE = 'no';
  const nodemailer = (await import('nodemailer')).default;

  for (let i = 0; i < count; i++) {
    const account = await nodemailer.createTestAccount();
    await pool.query(
      `INSERT INTO senders (email, smtp_host, smtp_port, smtp_user, smtp_pass)
       VALUES ($1, $2, $3, $4, $5)`,
      [account.user, account.smtp.host, account.smtp.port, account.user, account.pass],
    );
    console.log(`${account.user} / ${account.pass} -> ${account.web}/messages`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
