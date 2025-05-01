// src/routes/favorites.js

import express from 'express';
import pool from '../db.js';       // default export from db.js :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

/**
 * Decode et vérifie le JWT dans l'en-tête Authorization.
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 * @returns {object|null} payload JWT ou null + réponse 401
 */
function authenticate(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token missing' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// GET /api/favorites
// Retourne la liste des favoris pour l'utilisateur authentifié
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

    // Ajoute isFavorite pour compatibilité frontend
    res.json(rows.map(r => ({ ...r, isFavorite: true })));
  } catch (err) {
    console.error('Error loading favorites:', err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// POST /api/favorites/:jobId
// Ajoute l'annonce aux favoris de l'utilisateur
router.post('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  try {
    await pool.query(
      `INSERT INTO favorites(user_id, job_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user.id, req.params.jobId]
    );
    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/favorites/:jobId
// Supprime l'annonce des favoris de l'utilisateur
router.delete('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;

  try {
    await pool.query(
      `DELETE FROM favorites
       WHERE user_id = $1 AND job_id = $2`,
      [user.id, req.params.jobId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;
