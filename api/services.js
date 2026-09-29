const express = require('express');
const { pool } = require('../config/db');
const { verifierToken } = require('./auth');
const router = express.Router();

// GET /api/services — tous les services (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT s.*, u.nom as prestataire FROM services s JOIN users u ON s.prestataire_id = u.id ORDER BY s.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/services — ajouter un service (connecté)
router.post('/', verifierToken, async (req, res) => {
  try {
    const { nom, description, duree, prix } = req.body;
    if (!nom) return res.status(400).json({ erreur: 'Nom requis' });
    const [resultat] = await pool.query(
      'INSERT INTO services (prestataire_id, nom, description, duree, prix) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, nom, description, duree || 60, prix || 0]
    );
    res.status(201).json({ id: resultat.insertId, nom });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/services/:id/reserver — faire une réservation (public)
router.post('/:id/reserver', async (req, res) => {
  try {
    const { client_nom, client_email, date_rdv, heure_rdv } = req.body;
    if (!client_nom || !date_rdv || !heure_rdv) return res.status(400).json({ erreur: 'Champs requis manquants' });
    await pool.query(
      'INSERT INTO reservations (service_id, client_nom, client_email, date_rdv, heure_rdv) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, client_nom, client_email, date_rdv, heure_rdv]
    );
    res.status(201).json({ message: 'Réservation confirmée !' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// GET /api/services/mes-reservations — réservations reçues
router.get('/mes-reservations', verifierToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, s.nom as service FROM reservations r JOIN services s ON r.service_id = s.id WHERE s.prestataire_id = ? ORDER BY r.date_rdv ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
