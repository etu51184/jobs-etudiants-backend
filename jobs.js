// routes/jobs.js
import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const secret = process.env.JWT_SECRET || 'default_secret';

// Middleware to authenticate and attach user
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, secret, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = payload; // contains id, role
    next();
  });
};

// GET all jobs with pagination, search and filters
router.get('/', async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', type = 'all', location = '' } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    const clauses = [];
    const params = [];
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      clauses.push(`(LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
    }
    if (type !== 'all') {
      params.push(type);
      clauses.push(`contract_type = $${params.length}`);
    }
    if (location) {
      params.push(`%${location.toLowerCase()}%`);
      clauses.push(`LOWER(location) LIKE $${params.length}`);
    }
    const whereClause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';  

    // Count total
    const countSql = `SELECT COUNT(*) AS total FROM jobs ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    // Fetch paginated jobs
    params.push(limit, offset);
    const dataSql = `
      SELECT * FROM jobs
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const dataRes = await pool.query(dataSql, params);

    res.json({ jobs: dataRes.rows, page, pages, total });
  } catch (error) {
    console.error('Erreur SQL GET jobs paginated+search :', error);
    res.status(500).json({ error: 'Erreur lors du chargement des annonces' });
  }
});

// GET single job by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur SQL GET job by ID :', error);
    res.status(500).json({ error: "Erreur lors du chargement de l'annonce" });
  }
});

// POST a new job (requires auth)
router.post('/', authenticate, async (req, res) => {
  const {
    title,
    description,
    contractType,
    contract_type,
    location,
    schedule,
    days,
    contact,
    fullTime,
    duration,
    startDate,
    endDate,
    salary
  } = req.body;
  const contractTypeValue = contractType || contract_type;
  if (!contractTypeValue) {
    return res.status(400).json({ error: 'Le type de contrat est requis' });
  }
  try {
    // Use authenticated user ID, not body
    const creatorId = req.user.id;
    const result = await pool.query(
      `INSERT INTO jobs
         (title, description, contract_type, location, schedule, days, contact,
          created_by, full_time, duration, start_date, end_date, salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        title,
        description,
        contractTypeValue,
        location,
        schedule,
        days,
        contact,
        creatorId,
        fullTime,
        duration,
        startDate,
        endDate,
        salary
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur SQL POST job :', error);
    res.status(500).json({ error: "Erreur lors de la création de l'annonce" });
  }
});

// DELETE a job by ID (requires auth)
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // ensure only owner or admin can delete
    const fetchRes = await pool.query('SELECT created_by FROM jobs WHERE id = $1', [id]);
    if (fetchRes.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée' });
    const { created_by } = fetchRes.rows[0];
    if (req.user.id !== created_by && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Erreur SQL DELETE job :', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce' });
  }
});

export default router;
