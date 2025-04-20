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

// POST /api/users - Création d’un nouvel utilisateur
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la création de l’utilisateur :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/login - Connexion
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    res.status(200).json({ message: 'Connexion réussie', user: result.rows[0] });
  } catch (error) {
    console.error('Erreur de connexion :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
