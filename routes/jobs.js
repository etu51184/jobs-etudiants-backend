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
    req.user = payload; // { id, role, ... }
    next();
  });
};

/**
 * GET /api/jobs
 * - pagination via ?page=&limit=
 * - recherche sur le titre via ?search=
 * - filtre type via ?type=
 * - filtre lieu via ?location=
 * Retourne { jobs: [...], pages: N }
 */
router.get('/', async (req, res) => {
  try {
    // 1. Lire page & limit
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    // 2. Construire les filtres dynamiques
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

    const whereClause = filters.length
      ? 'WHERE ' + filters.join(' AND ')
      : '';

    // 3. Compter le total pour calculer le nombre de pages
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM jobs ${whereClause};`,
      values
    );
    const totalCount = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // 4. Récupérer la page demandée
    values.push(limit, offset);
    const dataRes = await pool.query(
      `
      SELECT *
      FROM jobs
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${idx} OFFSET $${idx + 1};
      `,
      values
    );

    // 5. Envoyer le résultat paginé
    res.json({
      jobs: dataRes.rows,
      pages: totalPages
    });

  } catch (err) {
    console.error('Erreur SQL GET jobs :', err);
    res.status(500).json({ error: 'Erreur lors du chargement des annonces' });
  }
});

/**
 * GET /api/jobs/me
 * Retourne les annonces créées par l'utilisateur authentifié
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
    console.error('Erreur SQL GET my jobs :', err);
    res.status(500).json({ error: 'Erreur lors du chargement de vos annonces' });
  }
});

// GET une annonce par ID: GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Annonce non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur SQL GET job by ID :', err);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'annonce' });
  }
});

// Créer une annonce (auth req): POST /api/jobs
router.post('/', authenticate, async (req, res) => {
  const {
    title, description,
    contractType, contract_type,
    location, schedule, days,
    contact, fullTime, duration,
    startDate, endDate, salary
  } = req.body;
  const contractTypeValue = contractType || contract_type;
  if (!contractTypeValue)
    return res.status(400).json({ error: 'Le type de contrat est requis' });
  try {
    const creatorId = req.user.id;
    const result = await pool.query(
      `INSERT INTO jobs
         (title, description, contract_type, location, schedule, days, contact,
          created_by, full_time, duration, start_date, end_date, salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        title, description, contractTypeValue, location,
        schedule, days, contact, creatorId,
        fullTime, duration, startDate, endDate, salary
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur SQL POST job :', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
  }
});

// Supprimer une annonce (proprio ou admin): DELETE /api/jobs/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const fetchRes = await pool.query(
      'SELECT created_by FROM jobs WHERE id = $1', [id]
    );
    if (fetchRes.rows.length === 0)
      return res.status(404).json({ error: 'Annonce non trouvée' });
    const owner = fetchRes.rows[0].created_by;
    if (req.user.id !== owner && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès refusé' });
    const result = await pool.query(
      'DELETE FROM jobs WHERE id = $1 RETURNING *', [id]
    );
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Erreur SQL DELETE job :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce' });
  }
});

export default router;
