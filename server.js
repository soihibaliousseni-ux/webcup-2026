// server.js
// Point d'entrée — compatible "Setup Node.js App" cPanel (Passenger)
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { testConnection } = require('./config/db');

const authRoutes = require('./api/auth');
const itemsRoutes = require('./api/items');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.use('/api/auth', authRoutes);
// app.use('/api/items', itemsRoutes);
app.use('/api/posts', require('./api/posts'));
app.use('/api/produits', require('./api/produits'));

// Healthcheck rapide (utile pour vérifier le déploiement en 2 secondes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fallback SPA — toute route inconnue renvoie index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  testConnection();
});
