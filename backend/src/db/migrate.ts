import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './pool';
import { logger } from '../utils/logger';

async function main() {
  const sql = readFileSync(join(process.cwd(), 'src/db/schema.sql'), 'utf8');
  await pool.query(sql);
  logger.info('schema applied');
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, 'migrate failed');
  process.exit(1);
});
