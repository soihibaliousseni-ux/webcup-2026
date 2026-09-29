const express = require('express');
const { pool } = require('../config/db');
const { verifierToken } = require('./auth');
const router = express.Router();

// GET /api/produits — tous les produits (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.*, u.nom as vendeur FROM produits p JOIN users u ON p.vendeur_id = u.id ORDER BY p.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/produits — ajouter un produit (vendeur connecté)
router.post('/', verifierToken, async (req, res) => {
  try {
    const { nom, description, prix, stock, categorie } = req.body;
    if (!nom || !prix) return res.status(400).json({ erreur: 'Nom et prix requis' });
    const [resultat] = await pool.query(
      'INSERT INTO produits (vendeur_id, nom, description, prix, stock, categorie) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, nom, description, prix, stock || 0, categorie || 'Autre']
    );
    res.status(201).json({ id: resultat.insertId, nom, prix });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/produits/:id/commander — passer une commande (public)
router.post('/:id/commander', async (req, res) => {
  try {
    const { acheteur_nom, acheteur_email, quantite } = req.body;
    if (!acheteur_nom) return res.status(400).json({ erreur: 'Nom requis' });
    await pool.query(
      'INSERT INTO commandes (produit_id, acheteur_nom, acheteur_email, quantite) VALUES (?, ?, ?, ?)',
      [req.params.id, acheteur_nom, acheteur_email, quantite || 1]
    );
    res.status(201).json({ message: 'Commande enregistrée !' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// GET /api/produits/mes-commandes — commandes reçues par le vendeur
router.get('/mes-commandes', verifierToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.*, p.nom as produit FROM commandes c JOIN produits p ON c.produit_id = p.id WHERE p.vendeur_id = ? ORDER BY c.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
