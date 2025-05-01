// src/routes/favorites.js

import express from 'express';
import pool from '../db.js';       // default export from db.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Utilise le même secret que pour users.js et jobs.js
const secret = process.env.JWT_SECRET || 'default_secret';

/**
 * Decode et vérifie le JWT dans l'en-tête Authorization.
 * @returns Payload utilisateur ({ id, email, role }) ou null + envoie 401.
 */
function authenticate(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token missing' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, secret);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// GET /api/favorites
// Liste tous les favoris de l'utilisateur
router.get('/', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  try {
    const { rows } = await pool.query(
      `SELECT f.job_id,
              j.title,
              j.location,
              j.contract_type,
              j.posted_at
       FROM favorites f
       JOIN jobs      j ON j.id = f.job_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.id]
    );
    // Ajoute un flag isFavorite pour chaque entrée
    res.json(rows.map(r => ({ ...r, isFavorite: true })));
  } catch (err) {
    console.error('Error loading favorites:', err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// GET /api/favorites/:jobId
// Indique si le job est en favori pour l'utilisateur
router.get('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  const jobId = req.params.jobId;
  try {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM favorites WHERE user_id = $1 AND job_id = $2`,
      [user.id, jobId]
    );
    res.json({ isFavorite: rowCount > 0 });
  } catch (err) {
    console.error('Error checking favorite:', err);
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

// POST /api/favorites/:jobId
// Ajoute un job aux favoris
router.post('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  const jobId = req.params.jobId;
  try {
    await pool.query(
      `INSERT INTO favorites(user_id, job_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user.id, jobId]
    );
    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/favorites/:jobId
// Retire un job des favoris
router.delete('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  const jobId = req.params.jobId;
  try {
    await pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND job_id = $2`,
      [user.id, jobId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;