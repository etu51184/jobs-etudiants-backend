import express from 'express';
import pool from './db.js';

const router = express.Router();

// GET all jobs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur SQL GET jobs :', error);
    res.status(500).json({ error: 'Erreur lors du chargement des annonces' });
  }
});

// GET one job by ID
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

  // support both camelCase and snake_case
  const contractTypeValue = contractType || contract_type;

  if (!contractTypeValue) {
    return res.status(400).json({ error: 'Le type de contrat est requis' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs
        (title, description, contract_type, location, schedule, days, contact,
         created_by, full_time, duration, start_date, end_date, salary)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annonce non trouvée pour suppression' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Erreur SQL DELETE job :', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce' });
  }
});

export default router;
