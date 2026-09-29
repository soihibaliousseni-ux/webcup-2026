const express = require('express');
const { pool } = require('../config/db');
const { verifierToken } = require('./auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT p.*, u.nom as auteur FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.post('/', verifierToken, async (req, res) => {
  try {
    const { titre, contenu, categorie } = req.body;
    if (!titre || !contenu) return res.status(400).json({ erreur: 'Titre et contenu requis' });
    const [resultat] = await pool.query('INSERT INTO posts (user_id, titre, contenu, categorie) VALUES (?, ?, ?, ?)', [req.user.id, titre, contenu, categorie || 'General']);
    res.status(201).json({ id: resultat.insertId, titre });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.delete('/:id', verifierToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
