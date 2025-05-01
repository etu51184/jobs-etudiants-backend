// src/routes/favorites.js
import express from 'express';
import { pool } from '../db.js';
import { authenticate } from './middleware.js'; // ton middleware JWT

const router = express.Router();

// Récupérer les favoris de l'utilisateur connecté
router.get('/', authenticate, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { rows } = await pool.query(
      `SELECT f.job_id, j.title, j.location, j.contract_type, j.posted_at
       FROM favorites f
       JOIN jobs j ON j.id = f.job_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// Ajouter un favori
router.post('/:jobId', authenticate, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;
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
router.delete('/:jobId', authenticate, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;
  try {
    await pool.query(`DELETE FROM favorites WHERE user_id = $1 AND job_id = $2`, [userId, jobId]);
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;