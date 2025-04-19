const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

const JOBS_FILE = './jobs.json';
const USERS_FILE = './users.json';

app.use(cors());
app.use(express.json());

// Get all jobs
app.get('/api/jobs', (req, res) => {
  if (!fs.existsSync(JOBS_FILE)) return res.json([]);
  const data = fs.readFileSync(JOBS_FILE);
  res.json(JSON.parse(data));
});

// Add a new job
app.post('/api/jobs', (req, res) => {
  const newJob = req.body;
  if (!newJob.id) newJob.id = Date.now();
  let jobs = fs.existsSync(JOBS_FILE) ? JSON.parse(fs.readFileSync(JOBS_FILE)) : [];
  jobs.push(newJob);
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
  res.status(201).json(newJob);
});

// Delete a job
app.delete('/api/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let jobs = fs.existsSync(JOBS_FILE) ? JSON.parse(fs.readFileSync(JOBS_FILE)) : [];
  const index = jobs.findIndex(j => j.id === id);
  if (index === -1) return res.status(404).json({ error: 'Job not found' });
  jobs.splice(index, 1);
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
  res.json({ message: 'Job deleted' });
});

// Create a user account
app.post('/api/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  if (users.find(u => u.username === username)) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(201).json({ message: 'Account created' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(403).json({ error: 'Incorrect password' });

  const isAdmin = username === 'Florian';
  res.json({ message: 'Logged in', isAdmin });
});

// Create default admin account on startup
(async () => {
  const adminUsername = "Florian";
  const adminPassword = "M1n3Cr@ft";
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  if (!users.find(u => u.username === adminUsername)) {
    const hash = await bcrypt.hash(adminPassword, 10);
    users.push({ username: adminUsername, password: hash });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log("✅ Admin account 'Florian' created");
  }
})();

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
