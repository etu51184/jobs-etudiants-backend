// routes/jobs.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all jobs with pagination, search and filters
router.get('/', async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', type = 'all', location = '' } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clauses
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

    // Count total with filters
    const countSql = `SELECT COUNT(*) AS total FROM jobs ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    // Fetch paginated data with filters
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

// GET one job by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur SQL GET job by ID :', error);
    res.status(500).json({ error: "Erreur lors du chargement de l'annonce" });
  }
});

// POST a job
router.post('/', async (req, res) => {
  const {
    title,
    description,
    contractType,
    contract_type,
    location,
    schedule,
    days,
    contact,
    createdBy,
    fullTime,
    duration,
    startDate,
    endDate,
    salary
  } = req.body;

  // Support both camelCase and snake_case for contract type
  const contractTypeValue = contractType || contract_type;
  if (!contractTypeValue) return res.status(400).json({ error: 'Le type de contrat est requis' });

  try {
    const result = await pool.query(
      `INSERT INTO jobs
         (title, description, contract_type, location, schedule, days, contact,
          created_by, full_time, duration, start_date, end_date, salary)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        title,
        description,
        contractTypeValue,
        location,
        schedule,
        days,
        contact,
        createdBy,
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

// DELETE a job by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée pour suppression' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Erreur SQL DELETE job :', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce' });
  }
});

export default router;
