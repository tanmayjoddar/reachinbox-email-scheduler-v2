import { pool } from '../db/pool';

export interface Sender {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

export async function listSenders(): Promise<Sender[]> {
  const { rows } = await pool.query('SELECT * FROM senders ORDER BY created_at ASC');
  return rows;
}
