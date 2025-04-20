import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ CORS Configuration
const allowedOrigins = ['https://jobs-etudiants.vercel.app', 'http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight

// Middleware
app.use(express.json());

// ROUTES

app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ ERREUR SQL :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des jobs' });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annonce non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du job' });
  }
});

app.post('/api/jobs', async (req, res) => {
  const {
    title, location, contractType, salary, contact, description,
    days, schedule, duration, startDate, endDate, fullTime, expiresInDays, createdBy
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO jobs (
        title, location, contract_type, salary, contact, description,
        days, schedule, duration, start_date, end_date, full_time, expires_in_days, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [title, location, contractType, salary, contact, description,
        days, schedule, duration, startDate, endDate, fullTime, expiresInDays, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création du job' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  if (!username) {
    return res.status(401).json({ error: 'Non autorisé (utilisateur requis)' });
  }

  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    const job = result.rows[0];
    if (!job) return res.status(404).json({ error: 'Annonce introuvable' });

    if (job.created_by !== username && username !== 'Florian') {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette annonce' });
    }

    await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    res.json({ message: 'Annonce supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend connecté à PostgreSQL — http://localhost:${PORT}`);
});
