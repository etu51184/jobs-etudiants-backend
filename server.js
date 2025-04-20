import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';

dotenv.config();
const app = express();

// Middleware CORS dynamique : autorise les appels depuis .vercel.app et localhost
app.use(cors({
  origin: (origin, callback) => {
    // autorise les requêtes sans origin (Postman, curl)
    if (!origin) return callback(null, true);
    try {
      const { hostname } = new URL(origin);
      // Autoriser les domaines en .vercel.app ou localhost:5173
      if (
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // Si URL invalide, rejette
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
