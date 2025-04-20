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

// Créer un utilisateur
router.post('/', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
    res.status(201).json({ message: 'Utilisateur créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la création d’utilisateur' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      res.json({ message: 'Connexion réussie', username });
    } else {
      res.status(401).json({ error: 'Identifiants invalides' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

export default router;
