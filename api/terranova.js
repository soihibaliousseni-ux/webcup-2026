const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = 's45f4ds5fgrtr4hytutyt45y4t54yty';
const API_URL = 'https://24h.webcup.fr/wp-json/webcup/v1/requests';

// GET /api/terranova/demandes — récupère les demandes en cours
router.get('/demandes', async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      headers: { 'X-Webcup-Api-Key': API_KEY },
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ erreur: 'Erreur connexion API Terra Nova' });
  }
});

module.exports = router;
