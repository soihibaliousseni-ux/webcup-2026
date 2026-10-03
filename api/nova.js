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
      [rows] = await pool.query('SELECT d.id, d.sujet, d.message, d.statut, d.created_at, u.nom as citoyen FROM demandes_citoyens d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC');
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
// Statistiques agent D17
router.get('/stats', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const [[attente]] = await pool.query("SELECT COUNT(*) as total FROM demandes_citoyens WHERE statut = 'en_attente'");
    const [[cours]] = await pool.query("SELECT COUNT(*) as total FROM demandes_citoyens WHERE statut = 'en_cours'");
    const [[resolu]] = await pool.query("SELECT COUNT(*) as total FROM demandes_citoyens WHERE statut = 'resolu'");
    const [[total]] = await pool.query("SELECT COUNT(*) as total FROM demandes_citoyens");
    res.json({ en_attente: attente.total, en_cours: cours.total, resolu: resolu.total, total: total.total });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Signalements F25
router.post('/signalements', verifierToken, async (req, res) => {
  try {
    const { type_probleme, description, localisation } = req.body;
    if (!type_probleme || !description) return res.status(400).json({ erreur: 'Type et description requis' });
    await pool.query('INSERT INTO signalements (user_id, type_probleme, description, localisation) VALUES (?, ?, ?, ?)', [req.user.id, type_probleme, description, localisation || '']);
    res.json({ message: '✅ Signalement envoyé avec succès !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.get('/signalements', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const [rows] = await pool.query('SELECT s.*, u.nom as citoyen FROM signalements s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Alertes D18 F29 F31
router.get('/alertes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM alertes WHERE actif = 1 ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.post('/alertes', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const { titre, message, type } = req.body;
    await pool.query('INSERT INTO alertes (titre, message, type) VALUES (?, ?, ?)', [titre, message, type || 'info']);
    res.json({ message: 'Alerte publiée !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.delete('/alertes/:id', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    await pool.query('UPDATE alertes SET actif = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alerte désactivée' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Transports F36
router.get('/transports', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transports ORDER BY ligne');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Rendez-vous F39 F40
router.post('/rendez-vous', verifierToken, async (req, res) => {
  try {
    const { service, date_rdv, heure, motif } = req.body;
    if (!service || !date_rdv || !heure) return res.status(400).json({ erreur: 'Service, date et heure requis' });
    await pool.query('INSERT INTO rendez_vous (user_id, service, date_rdv, heure, motif) VALUES (?, ?, ?, ?, ?)', [req.user.id, service, date_rdv, heure, motif || '']);
    res.json({ message: '✅ Rendez-vous confirmé ! Un rappel vous sera envoyé.' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.get('/rendez-vous', verifierToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'agent' || req.user.role === 'admin') {
      [rows] = await pool.query('SELECT r.*, u.nom as citoyen FROM rendez_vous r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.date_rdv, r.heure');
    } else {
      [rows] = await pool.query('SELECT * FROM rendez_vous WHERE user_id = ? ORDER BY date_rdv, heure', [req.user.id]);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// Audit log F47 F48
router.get('/audit', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const [rows] = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

async function logAudit(pool, agent_id, agent_nom, action, details) {
  try {
    await pool.query('INSERT INTO audit_log (agent_id, agent_nom, action, details) VALUES (?, ?, ?, ?)', [agent_id, agent_nom, action, details || '']);
  } catch {}
}
module.exports.logAudit = logAudit;

module.exports = router;
