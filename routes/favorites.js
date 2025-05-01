// src/routes/favorites.js
import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

/**
 * Vérifie le JWT dans l'en-tête Authorization et renvoie le payload utilisateur.
 * Envoie une réponse 401 si le token est manquant ou invalide.
 */
function authenticate(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token missing' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload;
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// Récupérer les favoris de l'utilisateur connecté
router.get('/', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;
  try {
    const { id: userId } = user;
    const { rows } = await pool.query(
      `SELECT f.job_id, j.title, j.location, j.contract_type, j.posted_at
       FROM favorites f
       JOIN jobs j ON j.id = f.job_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    // Renvoie un tableau d'objets avec champ isFavorite = true pour compatibilité frontend
    res.json(rows.map(r => ({ ...r, isFavorite: true })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// Ajouter un favori
router.post('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;
  const { jobId } = req.params;
  const userId = user.id;
  try {
    await pool.query(
      `INSERT INTO favorites(user_id, job_id) VALUES($1, $2) ON CONFLICT DO NOTHING`,
      [userId, jobId]
    );
    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Supprimer un favori
router.delete('/:jobId', async (req, res) => {
  const user = authenticate(req, res);
  if (!user) return;
  const { jobId } = req.params;
  const userId = user.id;
  try {
    await pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND job_id = $2`,
      [userId, jobId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;
