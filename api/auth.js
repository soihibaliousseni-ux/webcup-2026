cat > api/auth.js << 'EOF'
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_a_changer';

router.post('/register', async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Nom, email et mot de passe requis' });
    }
    const [existants] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existants.length > 0) {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [resultat] = await pool.query(
      'INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)',
      [nom, email, hash]
    );
    const role = 'citoyen';
    const token = jwt.sign({ id: resultat.insertId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: resultat.insertId, nom, email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'inscription' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }
    const user = rows[0];
    const valide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur lors de la connexion' });
  }
});

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erreur: 'Token manquant' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ erreur: 'Token invalide ou expiré' });
  }
}

module.exports = router;
module.exports.verifierToken = verifierToken;
EOF