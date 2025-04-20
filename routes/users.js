import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const secret = process.env.JWT_SECRET || "default_secret";

// 🔐 Middleware de vérification
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalide" });
    req.user = user;
    next();
  });
};

// 📥 Enregistrer un nouvel utilisateur
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur enregistrement utilisateur :", err);
    if (err.code === '23505') {
      res.status(400).json({ message: "Adresse email déjà utilisée." });
    } else {
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
});

// 🔑 Connexion
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ message: "Utilisateur non trouvé" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: "24h" });
    res.json({ token, email: user.email, role: user.role });
  } catch (err) {
    console.error("Erreur login :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 📋 Lister les utilisateurs (admin uniquement)
router.get("/", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
  try {
    const result = await pool.query("SELECT id, email FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération utilisateurs :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 🗑 Supprimer un utilisateur (admin uniquement)
router.delete("/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("Erreur suppression utilisateur :", err);
    res.status(500).json({ message: "Erreur suppression utilisateur" });
  }
});

export default router;
