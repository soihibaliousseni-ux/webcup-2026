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
app.use(express.json({ limit: '10kb' }));

// F77 F78 Performance charge
const cache = new Map();
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.includes('/nova/')) {
    const key = req.path;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < 5000) {
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, time: Date.now() });
      return originalJson(data);
    };
  }
  next();
});

// F69 Sécurité headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.use('/api/auth', authRoutes);
// app.use('/api/items', itemsRoutes);
app.use('/api/posts', require('./api/posts'));
app.use('/api/produits', require('./api/produits'));
app.use('/api/commandes', require('./api/commandes'));
app.use('/api/traduction', require('./api/traduction'));
app.use('/api/terranova', require('./api/terranova'));
app.use('/api/nova', require('./api/nova'));

// Healthcheck rapide (utile pour vérifier le déploiement en 2 secondes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fallback SPA — toute route inconnue renvoie index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  testConnection();
});
