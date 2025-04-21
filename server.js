import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './users.js';
import jobRoutes from './jobs.js';

// Charge les variables d'environnement
dotenv.config();
const app = express();

// Middleware CORS dynamique : autorise les requêtes depuis Vercel ou localhost
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, curl)
    if (!origin) return callback(null, true);
    try {
      const { hostname } = new URL(origin);
      if (
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost' ||
        hostname.startsWith('127.0.0.1')
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // Si URL invalide, rejette
    }
    callback(new Error(`Origin ${origin} non autorisée par CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parser le JSON des requêtes
app.use(express.json());

// Routes de l'application
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);

// Gestionnaire de route non trouvée
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Gestionnaire d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur le port ${PORT}`);
});
