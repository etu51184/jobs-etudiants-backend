import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';

dotenv.config();
const app = express();

// Liste des origines autorisées
const allowedOrigins = [
  'https://jobs-etudiants.vercel.app',
  'https://www.jobs-etudiants.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Middleware CORS personnalisé
app.use(cors({
  origin: (origin, callback) => {
    // autoriser les requêtes sans origin (Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} non autorisée par CORS`));
  }
}));

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Backend connecté à PostgreSQL — http://localhost:${PORT}`);
});
