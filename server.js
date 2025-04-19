const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = './annonces.json';
const USERS_FILE = './users.json';

app.use(cors());
app.use(express.json());

// Récupérer les annonces
app.get('/annonces', (req, res) => {
  if (!fs.existsSync(DB_FILE)) return res.json([]);
  const data = fs.readFileSync(DB_FILE);
  res.json(JSON.parse(data));
});

// Ajouter une annonce
app.post('/annonces', (req, res) => {
  const nouvelleAnnonce = req.body;
  if (!nouvelleAnnonce.id) nouvelleAnnonce.id = Date.now();
  let annonces = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : [];
  annonces.push(nouvelleAnnonce);
  fs.writeFileSync(DB_FILE, JSON.stringify(annonces, null, 2));
  res.status(201).json({ message: 'Annonce ajoutée' });
});

// Supprimer une annonce
app.delete('/annonces/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let annonces = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : [];
  const index = annonces.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: 'Annonce non trouvée' });
  annonces.splice(index, 1);
  fs.writeFileSync(DB_FILE, JSON.stringify(annonces, null, 2));
  res.json({ message: 'Annonce supprimée' });
});

// Créer un compte utilisateur
app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  if (users.find(u => u.username === username)) return res.status(409).json({ error: 'Nom déjà pris' });

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(201).json({ message: 'Compte créé' });
});

// Connexion
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Utilisateur inconnu' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(403).json({ error: 'Mot de passe incorrect' });

  const isAdmin = username === 'Florian';
  res.json({ message: 'Connecté', isAdmin });
});

// Créer compte admin au démarrage
(async () => {
  const adminNom = "Florian";
  const adminPass = "M1n3Cr@ft";
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  if (!users.find(u => u.username === adminNom)) {
    const hash = await bcrypt.hash(adminPass, 10);
    users.push({ username: adminNom, password: hash });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log("✅ Compte admin Florian créé");
  }
})();

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
