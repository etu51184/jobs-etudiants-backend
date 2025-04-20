import express from 'express';
const router = express.Router();

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET all jobs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY posted_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ ERREUR SQL :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST a new job
router.post('/', async (req, res) => {
  const {
    title,
    description,
    contract_type,
    location,
    schedule,
    days,
    contact,
    posted_by
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO jobs (title, description, contract_type, location, schedule, days, contact, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, contract_type, location, schedule, days, contact, posted_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ ERREUR SQL :', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'offre' });
  }
});

export default router;
