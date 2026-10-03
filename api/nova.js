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
      [rows] = await pool.query('SELECT d.id, d.sujet, d.message, d.statut, d.created_at, u.nom as citoyen, (SELECT COUNT(*) FROM soutiens WHERE demande_id = d.id) as nb_soutiens FROM demandes_citoyens d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC');
    } else {
      [rows] = await pool.query('SELECT d.*, (SELECT COUNT(*) FROM soutiens WHERE demande_id = d.id) as nb_soutiens FROM demandes_citoyens d WHERE d.user_id = ? ORDER BY d.created_at DESC', [req.user.id]);
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

// F34 Admin gestion comptes
router.get('/admin/citoyens', verifierToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ erreur: 'Accès refusé' });
    const [rows] = await pool.query('SELECT id, nom, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.put('/admin/citoyens/:id/role', verifierToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ erreur: 'Accès refusé' });
    const { role } = req.body;
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Rôle mis à jour' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F50 Dashboard activité
router.get('/dashboard', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const [[stats]] = await pool.query(`SELECT 
      (SELECT COUNT(*) FROM demandes_citoyens) as total_demandes,
      (SELECT COUNT(*) FROM demandes_citoyens WHERE statut='en_attente') as en_attente,
      (SELECT COUNT(*) FROM demandes_citoyens WHERE statut='en_cours') as en_cours,
      (SELECT COUNT(*) FROM demandes_citoyens WHERE statut='resolu') as resolus,
      (SELECT COUNT(*) FROM users WHERE role='citoyen') as total_citoyens,
      (SELECT COUNT(*) FROM signalements) as total_signalements,
      (SELECT COUNT(*) FROM rendez_vous) as total_rdv,
      (SELECT COUNT(*) FROM alertes WHERE actif=1) as alertes_actives
    `);
    res.json(stats);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F52 Soutenir une demande
router.post('/demandes/:id/soutenir', verifierToken, async (req, res) => {
  try {
    await pool.query('INSERT IGNORE INTO soutiens (demande_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
    const [[{count}]] = await pool.query('SELECT COUNT(*) as count FROM soutiens WHERE demande_id = ?', [req.params.id]);
    res.json({ message: '👍 Soutien enregistré !', soutiens: count });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F56 Export demandes PDF/JSON
router.get('/demandes/export', verifierToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT sujet, message, statut, created_at FROM demandes_citoyens WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="mes-demandes-terranova.json"');
    res.json({ citoyen: req.user.email, export_date: new Date().toISOString(), demandes: rows });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F55 Export données personnelles
router.get('/profil/export', verifierToken, async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT id, nom, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    const [demandes] = await pool.query('SELECT sujet, message, statut, created_at FROM demandes_citoyens WHERE user_id = ?', [req.user.id]);
    const [signalements] = await pool.query('SELECT type_probleme, description, localisation, statut, created_at FROM signalements WHERE user_id = ?', [req.user.id]);
    const [rdvs] = await pool.query('SELECT service, date_rdv, heure, motif, statut FROM rendez_vous WHERE user_id = ?', [req.user.id]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees-terranova.json"');
    res.json({ profil: user, demandes, signalements, rendez_vous: rdvs, export_date: new Date().toISOString() });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F63 F64 Statut services
router.put('/services/:id/statut', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const { statut, message_statut } = req.body;
    await pool.query('UPDATE services SET statut = ?, message_statut = ? WHERE id = ?', [statut, message_statut || null, req.params.id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F65 F66 F67 F68 Projets et votes
router.get('/projets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT p.*, (SELECT COUNT(*) FROM votes_projets WHERE projet_id = p.id AND avis = "pour") as votes_pour, (SELECT COUNT(*) FROM votes_projets WHERE projet_id = p.id AND avis = "contre") as votes_contre, (SELECT COUNT(*) FROM votes_projets WHERE projet_id = p.id AND avis = "neutre") as votes_neutre FROM projets p ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.post('/projets', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const { titre, description, statut } = req.body;
    await pool.query('INSERT INTO projets (titre, description, statut) VALUES (?, ?, ?)', [titre, description, statut || 'en_cours']);
    res.json({ message: 'Projet créé !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.post('/projets/:id/voter', verifierToken, async (req, res) => {
  try {
    const { avis, commentaire } = req.body;
    await pool.query('INSERT INTO votes_projets (projet_id, user_id, avis, commentaire) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE avis = ?, commentaire = ?', [req.params.id, req.user.id, avis, commentaire || '', avis, commentaire || '']);
    res.json({ message: '✅ Vote enregistré !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

router.post('/idees', verifierToken, async (req, res) => {
  try {
    const { titre, description } = req.body;
    await pool.query('INSERT INTO projets (titre, description, statut) VALUES (?, ?, "en_cours")', [titre, description]);
    res.json({ message: '💡 Idée soumise à la ville !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F76 Commentaires services
router.post('/services/:id/commentaire', verifierToken, async (req, res) => {
  try {
    const { commentaire, note } = req.body;
    await pool.query('INSERT INTO audit_log (agent_id, agent_nom, action, details) VALUES (?, ?, ?, ?)', 
      [req.user.id, req.user.email, 'Commentaire service', `Service #${req.params.id} — Note: ${note}/5 — ${commentaire}`]);
    res.json({ message: '⭐ Merci pour votre avis !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F79 F80 Filtrer et prioriser demandes
router.get('/demandes/filtrer', verifierToken, async (req, res) => {
  try {
    const { statut, sujet, priorite } = req.query;
    let query = `SELECT d.*, u.nom as citoyen,
      (SELECT COUNT(*) FROM soutiens WHERE demande_id = d.id) as nb_soutiens
      FROM demandes_citoyens d LEFT JOIN users u ON d.user_id = u.id WHERE 1=1`;
    const params = [];
    if (statut) { query += ' AND d.statut = ?'; params.push(statut); }
    if (sujet) { query += ' AND d.sujet LIKE ?'; params.push(`%${sujet}%`); }
    query += ' ORDER BY nb_soutiens DESC, d.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

// F84 Réponse agent à une demande
router.post('/demandes/:id/reponse', verifierToken, async (req, res) => {
  try {
    if (req.user.role === 'citoyen') return res.status(403).json({ erreur: 'Accès refusé' });
    const { reponse } = req.body;
    await pool.query('UPDATE demandes_citoyens SET reponse_agent = ?, statut = "resolu" WHERE id = ?', [reponse, req.params.id]);
    await pool.query('INSERT INTO audit_log (agent_id, agent_nom, action, details) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.email, 'Réponse agent', `Demande #${req.params.id} — ${reponse.substring(0, 50)}`]);
    res.json({ message: '✅ Réponse envoyée au citoyen !' });
  } catch (err) { res.status(500).json({ erreur: 'Erreur serveur' }); }
});

module.exports = router;