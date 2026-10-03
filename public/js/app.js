const API = '/api';
let token = localStorage.getItem('token');
let utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');

function afficherToast(message, type = 'succes') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;padding:1rem 1.5rem;background:${type === 'succes' ? '#1c6b7a' : '#c0392b'};color:white;border-radius:10px;font-family:Inter,sans-serif;font-size:0.95rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function echapper(t) {
  const d = document.createElement('div');
  d.textContent = t || '';
  return d.innerHTML;
}

function afficherOnglet(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  if (id === 'demandes-agent') chargerDemandesAgent();
  if (id === 'messages-agent') chargerMessagesAgent();
  if (id === 'api-nova') chargerAPINova();
  if (id === 'mes-demandes') chargerMesDemandes();
  if (id === 'services-citoyen') chargerServices('liste-services-citoyen');
  if (id === 'annonces-citoyen') chargerAnnonces('liste-annonces-citoyen');
}

function majAffichage() {
  const accueil = document.getElementById('ecran-accueil');
  const citoyen = document.getElementById('ecran-citoyen');
  const agent = document.getElementById('ecran-agent');
  const btnCo = document.getElementById('btn-connexion');
  const btnIn = document.getElementById('btn-inscription');
  const btnDe = document.getElementById('btn-deconnexion');
  const roleDisplay = document.getElementById('role-display');

  if (token && utilisateur) {
    accueil.classList.add('hidden');
    btnCo.classList.add('hidden');
    btnIn.classList.add('hidden');
    btnDe.classList.remove('hidden');
    roleDisplay.classList.remove('hidden');

    if (utilisateur.role === 'agent' || utilisateur.role === 'admin') {
      citoyen.classList.add('hidden');
      agent.classList.remove('hidden');
      document.getElementById('nom-agent').textContent = utilisateur.nom;
      roleDisplay.textContent = utilisateur.role === 'admin' ? '👑 Admin' : '⚙️ Agent';
      roleDisplay.className = 'role-badge ' + (utilisateur.role === 'admin' ? 'role-admin' : 'role-agent');
      chargerDemandesAgent();
    } else {
      agent.classList.add('hidden');
      citoyen.classList.remove('hidden');
      document.getElementById('nom-citoyen').textContent = utilisateur.nom;
      roleDisplay.textContent = '👤 Citoyen';
      roleDisplay.className = 'role-badge role-citoyen';
      chargerServices('liste-services-citoyen');
      chargerAnnonces('liste-annonces-citoyen');
    }
  } else {
    accueil.classList.remove('hidden');
    citoyen.classList.add('hidden');
    agent.classList.add('hidden');
    btnCo.classList.remove('hidden');
    btnIn.classList.remove('hidden');
    btnDe.classList.add('hidden');
    roleDisplay.classList.add('hidden');
    chargerServices('liste-services-public');
    chargerAnnonces('liste-annonces-public');
  }
}

function ouvrirModaleAuth(vue) {
  document.getElementById('modale-auth').classList.remove('hidden');
  document.getElementById('formulaire-connexion').classList.toggle('hidden', vue !== 'login');
  document.getElementById('formulaire-inscription').classList.toggle('hidden', vue !== 'register');
}

document.getElementById('btn-connexion').onclick = () => ouvrirModaleAuth('login');
document.getElementById('btn-inscription').onclick = () => ouvrirModaleAuth('register');
document.getElementById('fermer-modale').onclick = () => document.getElementById('modale-auth').classList.add('hidden');

document.getElementById('btn-deconnexion').onclick = () => {
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
    document.getElementById('modale-auth').classList.add('hidden');
    afficherToast('Bienvenue sur Terra Nova, ' + utilisateur.nom + ' !');
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
    document.getElementById('modale-auth').classList.add('hidden');
    afficherToast('Bienvenue sur Terra Nova !');
    majAffichage();
  } catch { erreurEl.textContent = 'Erreur serveur'; }
});

async function chargerServices(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/services`);
    const services = await res.json();
    el.innerHTML = services.map(s => `
      <div class="service-card">
        <div class="icone">${echapper(s.icone)}</div>
        <h3>${echapper(s.nom)}</h3>
        <p style="color:var(--gris-texte);font-size:0.9rem;">${echapper(s.description)}</p>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

async function chargerAnnonces(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/annonces`);
    const annonces = await res.json();
    if (annonces.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune annonce</p>'; return; }
    el.innerHTML = annonces.map(a => `
      <div class="annonce-card">
        <h3>📢 ${echapper(a.titre)}</h3>
        <p>${echapper(a.contenu)}</p>
        <small style="color:var(--gris-texte);">${new Date(a.created_at).toLocaleDateString('fr-FR')}</small>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

document.getElementById('form-contact').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch(`${API}/nova/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { afficherToast('Message envoyé !'); e.target.reset(); }
    else afficherToast(json.erreur, 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
});

async function chargerMesDemandes() {
  const el = document.getElementById('liste-mes-demandes');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/demandes`, { headers: { Authorization: `Bearer ${token}` } });
    const demandes = await res.json();
    if (demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande pour le moment</p>'; return; }
    el.innerHTML = demandes.map(d => `
      <div class="annonce-card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <h3>${echapper(d.sujet)}</h3>
          <span class="badge badge-${d.statut === 'en_attente' ? 'attente' : d.statut === 'en_cours' ? 'cours' : 'resolu'}">${d.statut.replace('_', ' ')}</span>
        </div>
        <p>${echapper(d.message)}</p>
        <small style="color:var(--gris-texte);">${new Date(d.created_at).toLocaleDateString('fr-FR')}</small>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

document.getElementById('form-demande').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch(`${API}/nova/demandes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { afficherToast('Demande soumise !'); e.target.reset(); chargerMesDemandes(); }
    else afficherToast(json.erreur, 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
});

async function chargerDemandesAgent() {
  const el = document.getElementById('liste-demandes-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/demandes`, { headers: { Authorization: `Bearer ${token}` } });
    const demandes = await res.json();
    if (demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande reçue</p>'; return; }
    el.innerHTML = demandes.map(d => `
      <div class="annonce-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3>${echapper(d.sujet)}</h3>
            <p style="font-size:0.85rem;color:var(--gris-texte);">Citoyen: ${echapper(d.citoyen)} — ${new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <select onchange="majStatutDemande(${d.id}, this.value)" style="padding:0.4rem;border-radius:8px;border:1px solid #ddd;">
            <option value="en_attente" ${d.statut === 'en_attente' ? 'selected' : ''}>En attente</option>
            <option value="en_cours" ${d.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="resolu" ${d.statut === 'resolu' ? 'selected' : ''}>Résolu</option>
          </select>
        </div>
        <p>${echapper(d.message)}</p>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

async function majStatutDemande(id, statut) {
  try {
    await fetch(`${API}/nova/demandes/${id}/statut`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ statut }) });
    afficherToast('Statut mis à jour !');
  } catch { afficherToast('Erreur', 'erreur'); }
}

async function chargerMessagesAgent() {
  const el = document.getElementById('liste-messages-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/messages`, { headers: { Authorization: `Bearer ${token}` } });
    const messages = await res.json();
    if (messages.length === 0) { el.innerHTML = '<p class="etat-vide">Aucun message</p>'; return; }
    el.innerHTML = messages.map(m => `
      <div class="annonce-card">
        <h3>✉️ ${echapper(m.nom)} ${m.email ? '— ' + echapper(m.email) : ''}</h3>
        <p>${echapper(m.message)}</p>
        <small style="color:var(--gris-texte);">${new Date(m.created_at).toLocaleDateString('fr-FR')}</small>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

async function chargerAPINova() {
  const el = document.getElementById('liste-api-nova');
  const sessionInfo = document.getElementById('session-info');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Connexion à l\'API Terra Nova...</p>';
  try {
    const res = await fetch(`${API}/terranova/demandes`);
    const data = await res.json();
    const session = data.session;
    const demandes = data.requests;
    if (sessionInfo) {
      sessionInfo.textContent = `Vague ${session.current_wave} | ${session.visible_requests_count} demandes | Prochaine vague dans ${session.minutes_until_next_wave} min`;
    }
    if (!demandes || demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande disponible</p>'; return; }
    el.innerHTML = demandes.map(d => `
      <div class="demande-api-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <span style="font-size:0.8rem;color:var(--gris-texte);">${echapper(d.request_code)}</span>
            <h3 style="margin:0.3rem 0;">${echapper(d.requester_name)}</h3>
            <span style="font-size:0.8rem;color:var(--gris-texte);">${echapper(d.requester_type)} — ${echapper(d.difficulty)}</span>
          </div>
          <span class="xp-badge">⭐ ${d.xp_total} XP</span>
        </div>
        <p style="margin:1rem 0;">${echapper(d.message_public)}</p>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur connexion API Terra Nova</p>'; }
}

majAffichage();
