const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_a_changer';

// F37 Anti-brute force
const tentatives = {};
function verifierTentatives(email) {
  const now = Date.now();
  if (!tentatives[email]) tentatives[email] = { count: 0, lastAttempt: now };
  if (now - tentatives[email].lastAttempt > 15 * 60 * 1000) {
    tentatives[email] = { count: 0, lastAttempt: now };
  }
  return tentatives[email].count;
}

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

    // Vérifier tentatives F37
    if (verifierTentatives(email) >= 5) {
      return res.status(429).json({ erreur: '🔒 Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      if (!tentatives[email]) tentatives[email] = { count: 0, lastAttempt: Date.now() };
      tentatives[email].count++;
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }
    const user = rows[0];
    const valide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valide) {
      tentatives[email].count++;
      return res.status(401).json({ erreur: `Email ou mot de passe incorrect (${tentatives[email].count}/5 tentatives)` });
    }
    tentatives[email] = { count: 0, lastAttempt: Date.now() };
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

// Suppression compte F33
router.delete('/compte', verifierToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// D02 Magic link / OTP
const otpStore = {};

router.post('/otp/demander', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erreur: 'Email requis' });
    const [rows] = await pool.query('SELECT id, nom, email, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ erreur: 'Aucun compte avec cet email' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { code, expires: Date.now() + 5 * 60 * 1000, user: rows[0] };
    res.json({ message: `Code envoyé ! (démo: ${code})`, code });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.post('/otp/verifier', async (req, res) => {
  try {
    const { email, code } = req.body;
    const otp = otpStore[email];
    if (!otp) return res.status(400).json({ erreur: 'Aucun code demandé pour cet email' });
    if (Date.now() > otp.expires) { delete otpStore[email]; return res.status(400).json({ erreur: 'Code expiré' }); }
    if (otp.code !== code) return res.status(400).json({ erreur: 'Code incorrect' });
    delete otpStore[email];
    const token = jwt.sign({ id: otp.user.id, email: otp.user.email, role: otp.user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: otp.user });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F71 Inscription sans email
router.post('/register-simple', async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ erreur: 'Nom requis' });
    const identifiant = 'citoyen_' + Math.random().toString(36).substring(2, 8);
    const mdp = Math.random().toString(36).substring(2, 10);
    const hash = await bcrypt.hash(mdp, 10);
    const email = identifiant + '@terranova.local';
    const [resultat] = await pool.query(
      'INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)',
      [nom, email, hash]
    );
    const token = jwt.sign({ id: resultat.insertId, email, role: 'citoyen' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: resultat.insertId, nom, email, role: 'citoyen' }, identifiant, mot_de_passe: mdp, message: '✅ Compte créé ! Notez votre identifiant et mot de passe.' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

module.exports = router;
module.exports.verifierToken = verifierToken;