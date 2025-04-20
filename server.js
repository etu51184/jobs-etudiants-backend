import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: 'https://jobs-etudiants.vercel.app',
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
