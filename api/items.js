// api/items.js
// CRUD générique — table "items" à renommer selon le sujet réel (ex: "commandes", "projets", "rendez-vous"...)
const express = require('express');
const { pool } = require('../config/db');
const { verifierToken } = require('./auth');

const router = express.Router();

// GET /api/items — liste des items de l'utilisateur connecté
router.get('/', verifierToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des données' });
  }
});

// POST /api/items — créer un item
router.post('/', verifierToken, async (req, res) => {
  try {
    const { titre, description } = req.body;
    if (!titre) return res.status(400).json({ erreur: 'Titre requis' });

    const [resultat] = await pool.query(
      'INSERT INTO items (user_id, titre, description) VALUES (?, ?, ?)',
      [req.user.id, titre, description || '']
    );
    res.status(201).json({ id: resultat.insertId, titre, description, statut: 'actif' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur lors de la création' });
  }
});

// PUT /api/items/:id — modifier un item
router.put('/:id', verifierToken, async (req, res) => {
  try {
    const { titre, description, statut } = req.body;
    await pool.query(
      'UPDATE items SET titre = ?, description = ?, statut = ? WHERE id = ? AND user_id = ?',
      [titre, description, statut, req.params.id, req.user.id]
    );
    res.json({ message: 'Mis à jour avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour' });
  }
});

// DELETE /api/items/:id — supprimer un item
router.delete('/:id', verifierToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
