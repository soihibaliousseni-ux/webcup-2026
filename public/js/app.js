const API = '/api';
let token = localStorage.getItem('token');
let utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');

const elAccueil = document.getElementById('ecran-accueil');
const elDashboard = document.getElementById('ecran-dashboard');
const modaleAuth = document.getElementById('modale-auth');
const modaleItem = document.getElementById('modale-item');
const btnConnexion = document.getElementById('btn-connexion');
const btnInscription = document.getElementById('btn-inscription');
const btnDeconnexion = document.getElementById('btn-deconnexion');
const btnCommencer = document.getElementById('btn-commencer');

function afficherToast(message, type = 'succes') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:2rem;right:2rem;padding:1rem 1.5rem;
    background:${type === 'succes' ? '#1c6b7a' : '#c0392b'};
    color:white;border-radius:10px;font-family:Inter,sans-serif;
    font-size:0.95rem;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function afficherSpinner(liste) {
  liste.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
}

function majAffichage() {
  if (token && utilisateur) {
    elAccueil.classList.add('hidden');
    elDashboard.classList.remove('hidden');
    btnConnexion.classList.add('hidden');
    btnInscription.classList.add('hidden');
    btnDeconnexion.classList.remove('hidden');
    document.getElementById('nom-utilisateur').textContent = utilisateur.nom;
    chargerPosts();
  } else {
    elAccueil.classList.remove('hidden');
    elDashboard.classList.add('hidden');
    btnConnexion.classList.remove('hidden');
    btnInscription.classList.remove('hidden');
    btnDeconnexion.classList.add('hidden');
  }
}

function ouvrirModaleAuth(vue) {
  modaleAuth.classList.remove('hidden');
  document.getElementById('formulaire-connexion').classList.toggle('hidden', vue !== 'login');
  document.getElementById('formulaire-inscription').classList.toggle('hidden', vue !== 'register');
}

btnConnexion.onclick = () => ouvrirModaleAuth('login');
btnInscription.onclick = () => ouvrirModaleAuth('register');
btnCommencer.onclick = () => ouvrirModaleAuth('register');
document.getElementById('fermer-modale').onclick = () => modaleAuth.classList.add('hidden');

btnDeconnexion.onclick = () => {
  token = null; utilisateur = null;
  localStorage.removeItem('token');
  localStorage.removeItem('utilisateur');
  majAffichage();
};

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const erreurEl = document.getElementById('erreur-login');
  erreurEl.textContent = '';
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { erreurEl.textContent = json.erreur; return; }
    token = json.token; utilisateur = json.user;
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
    modaleAuth.classList.add('hidden');
    afficherToast('Bienvenue ' + utilisateur.nom + ' !');
    majAffichage();
  } catch { erreurEl.textContent = 'Erreur serveur'; }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const erreurEl = document.getElementById('erreur-register');
  erreurEl.textContent = '';
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { erreurEl.textContent = json.erreur; return; }
    token = json.token; utilisateur = json.user;
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
    modaleAuth.classList.add('hidden');
    afficherToast('Compte créé avec succès !');
    majAffichage();
  } catch { erreurEl.textContent = 'Erreur serveur'; }
});

async function chargerPosts() {
  const liste = document.getElementById('liste-items');
  afficherSpinner(liste);
  try {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    if (posts.length === 0) {
      liste.innerHTML = '<p class="etat-vide">Aucun post pour le moment. Soyez le premier !</p>';
      return;
    }
    liste.innerHTML = posts.map(p => `
      <div class="item-carte">
        <div>
          <h3>${echapper(p.titre)}</h3>
          <p>${echapper(p.contenu)}</p>
          <p style="font-size:0.8rem;color:#888">Par ${echapper(p.auteur)} — ${echapper(p.categorie)}</p>
        </div>
        <div class="item-actions">
          <button onclick="supprimerPost(${p.id}, this)">Supprimer</button>
        </div>
      </div>
    `).join('');
  } catch { liste.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

document.getElementById('btn-nouveau').onclick = () => {
  document.getElementById('form-item').reset();
  modaleItem.classList.remove('hidden');
};
document.getElementById('fermer-modale-item').onclick = () => modaleItem.classList.add('hidden');

document.getElementById('form-item').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    if (res.ok) {
      modaleItem.classList.add('hidden');
      afficherToast('Post publié avec succès !');
      chargerPosts();
    } else {
      afficherToast('Erreur lors de la publication', 'erreur');
    }
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Publier'; btn.disabled = false; }
});

async function supprimerPost(id, btn) {
  if (!confirm('Supprimer ce post ?')) return;
  btn.textContent = '...'; btn.disabled = true;
  try {
    await fetch(`${API}/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    afficherToast('Post supprimé');
    chargerPosts();
  } catch { afficherToast('Erreur', 'erreur'); }
}

function echapper(texte) {
  const div = document.createElement('div');
  div.textContent = texte;
  return div.innerHTML;
}

majAffichage();