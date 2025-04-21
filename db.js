// db.js (à la racine)
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default pool;  // :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
