// routes/jobs.js
import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const secret = process.env.JWT_SECRET || 'default_secret';

// Middleware d'authentification
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, secret, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = payload;
    next();
  });
};

/**
 * GET /api/jobs
 * Pagination, recherche par titre, filtre par type et lieu
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const filters = [];
    const values = [];
    let idx = 1;

    if (req.query.search) {
      filters.push(`title ILIKE $${idx}`);
      values.push(`%${req.query.search}%`);
      idx++;
    }
    if (req.query.type && req.query.type !== 'all') {
      filters.push(`contract_type = $${idx}`);
      values.push(req.query.type);
      idx++;
    }
    if (req.query.location) {
      filters.push(`location ILIKE $${idx}`);
      values.push(`%${req.query.location}%`);
      idx++;
    }

    const whereClause = filters.length ? 'WHERE ' + filters.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM jobs ${whereClause};`,
      values
    );
    const totalCount = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    values.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT * FROM jobs ${whereClause} ORDER BY id DESC LIMIT $${idx} OFFSET $${idx + 1};`,
      values
    );

    res.json({ jobs: dataRes.rows, pages: totalPages });
  } catch (err) {
    console.error('Erreur SQL GET jobs :', err.stack);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jobs/me
 * Annonces de l'utilisateur
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM jobs WHERE created_by = $1 ORDER BY id DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur SQL GET my jobs :', err.stack);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jobs/:id
 * Annonce par ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur SQL GET job by ID :', err.stack);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs
 * Créer une annonce (auth requise)
 * Accepte champs personnalisés en JSONB
 */
router.post('/', authenticate, async (req, res) => {
  const {
    title,
    description,
    contract_type,
    location,
    schedule = null,
    days = null,
    contact,
    full_time = null,
    duration = null,
    start_date = null,
    end_date = null,
    salary = null,
    custom_fields = []
  } = req.body;

  if (!contract_type) {
    return res.status(400).json({ error: 'Le type de contrat est requis' });
  }

  try {
    const creatorId = req.user.id;
    const result = await pool.query(
      `INSERT INTO jobs
         (title, description, contract_type, location,
          schedule, days, contact, created_by,
          full_time, duration, start_date, end_date,
          salary, custom_fields)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        title,
        description,
        contract_type,
        location,
        schedule,
        days,
        contact,
        creatorId,
        full_time,
        duration,
        start_date,
        end_date,
        salary,
        custom_fields
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur SQL POST job :', err.stack);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/jobs/:id
 * Supprimer une annonce
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const fetchRes = await pool.query('SELECT created_by FROM jobs WHERE id = $1', [id]);
    if (fetchRes.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée' });

    const owner = fetchRes.rows[0].created_by;
    if (req.user.id !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Erreur SQL DELETE job :', err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;
