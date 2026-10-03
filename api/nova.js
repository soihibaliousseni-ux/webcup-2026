const express = require('express');
const { pool } = require('../config/db');
const { verifierToken } = require('./auth');
const router = express.Router();

// Services municipaux
router.get('/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Annonces
router.get('/annonces', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM annonces ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Contact
router.post('/contact', async (req, res) => {
  try {
    const { nom, email, message } = req.body;
    if (!nom || !message) return res.status(400).json({ erreur: 'Nom et message requis' });
    await pool.query('INSERT INTO messages_contact (nom, email, message) VALUES (?, ?, ?)', [nom, email, message]);
    res.json({ message: 'Message envoyé avec succès !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Demandes citoyens
router.post('/demandes', verifierToken, async (req, res) => {
  try {
    const { sujet, message } = req.body;
    if (!sujet || !message) return res.status(400).json({ erreur: 'Sujet et message requis' });
    await pool.query('INSERT INTO demandes_citoyens (user_id, sujet, message) VALUES (?, ?, ?)', [req.user.id, sujet, message]);
    res.json({ message: 'Demande soumise avec succès !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.get('/demandes', verifierToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin' || req.user.role === 'agent') {
      [rows] = await pool.query('SELECT d.*, u.nom as citoyen FROM demandes_citoyens d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC');
    } else {
      [rows] = await pool.query('SELECT * FROM demandes_citoyens WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.put('/demandes/:id/statut', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const { statut } = req.body;
    await pool.query('UPDATE demandes_citoyens SET statut = ? WHERE id = ?', [statut, req.params.id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Messages contact (agents/admin)
router.get('/messages', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const [rows] = await pool.query('SELECT * FROM messages_contact ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

module.exports = router;
