# Template Webcup — Chanbé IA

Base de travail prête à l'emploi pour le 24h By Webcup. À adapter au sujet dès qu'il tombe le 3 octobre à 9h.

## Structure

```
├── server.js           → point d'entrée Express
├── api/
│   ├── auth.js          → login / register / middleware JWT
│   └── items.js         → CRUD générique (renommer "items" selon le sujet)
├── config/
│   ├── db.js             → connexion MySQL (pool)
│   └── schema.sql         → structure des tables à importer
├── public/
│   ├── index.html          → page unique (accueil + auth + dashboard)
│   ├── css/style.css        → design lagon/corail
│   └── js/app.js             → logique front (fetch API, auth, CRUD)
└── .env.example                → à copier en .env avec les vrais identifiants
```

## Mise en route le jour J

1. **Copier `.env.example` → `.env`** et remplir avec les identifiants cPanel HODI reçus lundi 29/09 :
   ```
   DB_USER=chanbeia_xxx
   DB_PASSWORD=...
   DB_NAME=chanbeia_xxx
   ```

2. **Importer `config/schema.sql`** dans phpMyAdmin (accessible depuis le cPanel).

3. **Sur le cPanel → "Setup Node.js App"** :
   - Créer une application Node.js
   - Pointer vers ce dossier
   - Version Node : LTS la plus récente disponible
   - Fichier de démarrage : `server.js`

4. **Déployer via HodiFly** : connecter le repo GitHub → chaque `git push` déploie automatiquement.

5. **Adapter au sujet** :
   - Renommer `items` → nom métier réel dans `schema.sql`, `api/items.js`, `public/js/app.js`
   - Réécrire le texte du `<section class="hero">` dans `index.html`
   - Ajuster les champs du formulaire "Nouvel élément" selon les besoins

## Test rapide

```bash
npm install
npm start
# puis vérifier http://localhost:3000/api/health
```

## Export mobile avec Evolutus

Une fois l'app fonctionnelle et validée : passer le dossier dans Evolutus pour générer l'APK de démonstration en direct.
