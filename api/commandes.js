const express = require('express');
const { pool } = require('../config/db');
const { envoyerConfirmationCommande } = require('../config/mailer');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { produit_id, acheteur_nom, acheteur_email, quantite } = req.body;
    if (!produit_id || !acheteur_nom) return res.status(400).json({ erreur: 'Produit et nom requis' });
    const [produits] = await pool.query('SELECT * FROM produits WHERE id = ?', [produit_id]);
    if (produits.length === 0) return res.status(404).json({ erreur: 'Produit introuvable' });
    const produit = produits[0];
    const qte = quantite || 1;
    if (produit.stock < qte) return res.status(400).json({ erreur: 'Stock insuffisant' });
    const total = produit.prix * qte;
    const [resultat] = await pool.query(
      'INSERT INTO commandes (produit_id, acheteur_nom, acheteur_email, quantite, total) VALUES (?, ?, ?, ?, ?)',
      [produit_id, acheteur_nom, acheteur_email, qte, total]
    );
    await pool.query('UPDATE produits SET stock = stock - ? WHERE id = ?', [qte, produit_id]);

    // Email automatique si email fourni
    if (acheteur_email) {
      await envoyerConfirmationCommande({
        acheteur_nom,
        acheteur_email,
        produit_nom: produit.nom,
        quantite: qte,
        total,
        commande_id: resultat.insertId
      });
    }

    res.status(201).json({
      message: '✅ Commande confirmée ! Email envoyé automatiquement.',
      commande_id: resultat.insertId,
      total,
      stock_restant: produit.stock - qte
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT c.*, p.nom as produit, p.prix FROM commandes c JOIN produits p ON c.produit_id = p.id ORDER BY c.created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
