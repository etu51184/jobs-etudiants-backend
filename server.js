// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';

dotenv.config();
const app = express();

// CORS dynamique : autorise .vercel.app, localhost et Postman/curl
app.use(cors({
  origin: (origin, callback) => {
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
    } catch {
      // URL invalide : refuse
    }
    callback(new Error(`Origin ${origin} non autorisée par CORS`));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// JSON parser
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);

// 404 pour toutes les autres routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Handler d'erreur global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Démarrage
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur le port ${PORT}`);
});
