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
  if (aidesOnglets && aidesOnglets[id]) afficherAide(aidesOnglets[id]);
  if (id === 'demandes-agent') { chargerDemandesAgent(); chargerStatsAgent(); }
  if (id === 'messages-agent') chargerMessagesAgent();
  if (id === 'signalements-agent') chargerSignalementsAgent();
  if (id === 'alertes-agent') { chargerAlertesAgent(); }
  if (id === 'api-nova') chargerAPINova();
  if (id === 'mes-demandes') chargerMesDemandes();
  if (id === 'services-citoyen') chargerServices('liste-services-citoyen');
  if (id === 'transports') chargerTransports();
  if (id === 'rendez-vous') { chargerMesRdv(); }
    if (id === 'rdv-agent') chargerRdvAgent();
  if (id === 'audit-agent') chargerAudit();
  if (id === 'annonces-citoyen') chargerAnnonces('liste-annonces-citoyen');
}

function ouvrirModaleService(nom, description, icone) {
  document.getElementById('detail-service').innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;">
      <div style="font-size:3rem;">${echapper(icone)}</div>
      <h2>${echapper(nom)}</h2>
    </div>
    <p>${echapper(description)}</p>
    <div style="margin-top:1.5rem;padding:1rem;background:#f8f9fa;border-radius:10px;">
      <p style="font-size:0.9rem;color:#666;">Pour accéder à ce service, connectez-vous à votre espace citoyen ou soumettez une demande.</p>
    </div>
    <button onclick="fermerModaleService();ouvrirModaleAuth('login');" class="btn-plein" style="width:100%;margin-top:1rem;">Accéder à mon espace</button>
  `;
  document.getElementById('modale-service').classList.remove('hidden');
}

function fermerModaleService() {
  document.getElementById('modale-service').classList.add('hidden');
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
      chargerStatsAgent();
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
    if (!res.ok) { erreurEl.textContent = json.erreur || 'Erreur de connexion'; return; }
    token = json.token; utilisateur = json.user;
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
    document.getElementById('modale-auth').classList.add('hidden');
    afficherToast('Bienvenue sur Terra Nova, ' + utilisateur.nom + ' !');
    majAffichage();
  } catch { erreurEl.textContent = 'Erreur serveur, réessayez'; }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const erreurEl = document.getElementById('erreur-register');
  erreurEl.textContent = '';
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { erreurEl.textContent = json.erreur || 'Erreur inscription'; return; }
    token = json.token; utilisateur = json.user;
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
    document.getElementById('modale-auth').classList.add('hidden');
    afficherToast('Bienvenue sur Terra Nova !');
    if (!localStorage.getItem('onboarding-done')) {
      setTimeout(() => document.getElementById('modale-onboarding').classList.remove('hidden'), 500);
    }
    majAffichage();
  } catch { erreurEl.textContent = 'Erreur serveur, réessayez'; }
});

async function chargerServices(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/services`);
    const services = await res.json();
    el.innerHTML = services.map((s, i) => `
      <div class="service-card ${i < 2 ? 'featured' : ''}" onclick="ouvrirModaleService('${echapper(s.nom)}','${echapper(s.description)}','${echapper(s.icone)}')">
        ${i < 2 ? '<span style="font-size:0.7rem;background:var(--corail);color:white;padding:0.2rem 0.5rem;border-radius:10px;display:inline-block;margin-bottom:0.5rem;">⭐ Populaire</span>' : ''}
        <div class="icone">${echapper(s.icone)}</div>
        <h3>${echapper(s.nom)}</h3>
        <p style="color:var(--gris-texte);font-size:0.9rem;">${echapper(s.description)}</p>
        <span style="font-size:0.8rem;color:var(--corail);margin-top:0.5rem;display:block;">En savoir plus →</span>
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
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/nova/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) {
      e.target.reset();
      const conf = document.getElementById('confirmation-contact');
      conf.style.display = 'block';
      setTimeout(() => conf.style.display = 'none', 5000);
      afficherToast('Message envoyé à l\'administration !');
    } else {
      afficherToast(json.erreur || 'Erreur envoi', 'erreur');
    }
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Envoyer'; btn.disabled = false; }
});

async function chargerMesDemandes() {
  const el = document.getElementById('liste-mes-demandes');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/demandes`, { headers: { Authorization: `Bearer ${token}` } });
    const demandes = await res.json();
    if (demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande pour le moment.</p>'; return; }
    el.innerHTML = demandes.map(d => `
      <div class="annonce-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <h3>${echapper(d.sujet)}</h3>
          <span class="badge badge-${d.statut === 'en_attente' ? 'attente' : d.statut === 'en_cours' ? 'cours' : 'resolu'}">${d.statut.replace('_', ' ')}</span>
        </div>
        <p>${echapper(d.message)}</p>
        <small style="color:var(--gris-texte);">${new Date(d.created_at).toLocaleDateString('fr-FR')}</small>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

document.getElementById('form-demande').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/nova/demandes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { afficherToast('✅ Demande soumise avec succès !'); e.target.reset(); chargerMesDemandes(); }
    else afficherToast(json.erreur || 'Erreur', 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Soumettre'; btn.disabled = false; }
});

async function chargerDemandesAgent() {
  const el = document.getElementById('liste-demandes-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/demandes`, { headers: { Authorization: `Bearer ${token}` } });
    const demandes = await res.json();
    if (demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande reçue pour le moment</p>'; return; }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:var(--ombre);">
        <thead style="background:var(--lagon-500);color:white;">
          <tr>
            <th style="padding:1rem;text-align:left;">Référence</th>
            <th style="padding:1rem;text-align:left;">Citoyen</th>
            <th style="padding:1rem;text-align:left;">Sujet</th>
            <th style="padding:1rem;text-align:left;">Date</th>
            <th style="padding:1rem;text-align:left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${demandes.map(d => `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:1rem;font-weight:600;color:var(--corail);">TN-${String(d.id).padStart(3,'0')}</td>
              <td style="padding:1rem;">${echapper(d.citoyen)}</td>
              <td style="padding:1rem;">${echapper(d.sujet)}</td>
              <td style="padding:1rem;font-size:0.85rem;color:var(--gris-texte);">${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
              <td style="padding:1rem;">
                <select onchange="majStatutDemande(${d.id}, this.value)" style="padding:0.4rem;border-radius:8px;border:1px solid #ddd;font-size:0.85rem;">
                  <option value="en_attente" ${d.statut === 'en_attente' ? 'selected' : ''}>Nouveau</option>
                  <option value="en_cours" ${d.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
                  <option value="resolu" ${d.statut === 'resolu' ? 'selected' : ''}>Traité</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

async function majStatutDemande(id, statut) {
  try {
    await fetch(`${API}/nova/demandes/${id}/statut`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ statut }) });
    afficherToast('Statut mis à jour !');
    chargerStatsAgent();
  } catch { afficherToast('Erreur', 'erreur'); }
}

async function chargerMessagesAgent() {
  const el = document.getElementById('liste-messages-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/messages`, { headers: { Authorization: `Bearer ${token}` } });
    const messages = await res.json();
    if (messages.length === 0) { el.innerHTML = '<p class="etat-vide">Aucun message reçu</p>'; return; }
    el.innerHTML = messages.map(m => `
      <div class="annonce-card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <h3>✉️ ${echapper(m.nom)}</h3>
          <small style="color:var(--gris-texte);">${new Date(m.created_at).toLocaleDateString('fr-FR')}</small>
        </div>
        ${m.email ? `<p style="font-size:0.85rem;color:var(--gris-texte);">📧 ${echapper(m.email)}</p>` : ''}
        <p>${echapper(m.message)}</p>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
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
    if (sessionInfo && session) {
      sessionInfo.textContent = `Vague ${session.current_wave} | ${session.visible_requests_count} demandes | Prochaine dans ${session.minutes_until_next_wave} min`;
    }
    const synchro = document.getElementById('synchro-info');
    if (synchro) synchro.textContent = `— Synchro : ${new Date().toLocaleTimeString('fr-FR')}`;
    if (!demandes || demandes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune demande disponible</p>'; return; }
    el.innerHTML = demandes.map(d => `
      <div class="demande-api-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <span style="font-size:0.8rem;font-weight:600;color:var(--corail);">${echapper(d.request_code)}</span>
            <h3 style="margin:0.3rem 0;">${echapper(d.requester_name)}</h3>
            <span style="font-size:0.8rem;color:var(--gris-texte);">${echapper(d.requester_type)} — ${echapper(d.difficulty)}</span>
          </div>
          <span class="xp-badge">⭐ ${d.xp_total} XP</span>
        </div>
        <p style="margin:1rem 0;line-height:1.6;">${echapper(d.message_public)}</p>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur connexion API Terra Nova</p>'; }
}

async function chargerStatsAgent() {
  const el = document.getElementById('stats-agent');
  if (!el) return;
  try {
    const res = await fetch(`${API}/nova/stats`, { headers: { Authorization: `Bearer ${token}` } });
    const stats = await res.json();
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-nombre" style="color:#856404;">${stats.en_attente}</div>
        <div class="stat-label">⏳ En attente</div>
      </div>
      <div class="stat-card">
        <div class="stat-nombre" style="color:#004085;">${stats.en_cours}</div>
        <div class="stat-label">🔄 En cours</div>
      </div>
      <div class="stat-card">
        <div class="stat-nombre" style="color:#155724;">${stats.resolu}</div>
        <div class="stat-label">✅ Résolus</div>
      </div>
      <div class="stat-card">
        <div class="stat-nombre" style="color:var(--lagon-700);">${stats.total}</div>
        <div class="stat-label">📋 Total</div>
      </div>
    `;
  } catch { }
}

// ACCESSIBILITÉ F21 F23 F24
let tailleCourante = 100;

function changerTaille(direction) {
  tailleCourante = Math.min(150, Math.max(80, tailleCourante + (direction * 10)));
  document.body.style.fontSize = tailleCourante + '%';
  localStorage.setItem('taille-texte', tailleCourante);
}

function toggleContraste() {
  document.body.classList.toggle('contraste-eleve');
  const btn = document.getElementById('btn-contraste');
  const actif = document.body.classList.contains('contraste-eleve');
  btn.classList.toggle('actif', actif);
  btn.setAttribute('aria-pressed', actif);
  localStorage.setItem('contraste-eleve', actif);
}

const tailleStockee = localStorage.getItem('taille-texte');
if (tailleStockee) { tailleCourante = parseInt(tailleStockee); document.body.style.fontSize = tailleCourante + '%'; }
if (localStorage.getItem('contraste-eleve') === 'true') { document.body.classList.add('contraste-eleve'); document.getElementById('btn-contraste').classList.add('actif'); }

majAffichage();

// SIGNALEMENT F25
document.getElementById('form-signalement') && document.getElementById('form-signalement').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/nova/signalements`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { afficherToast('🚨 Signalement envoyé !'); e.target.reset(); }
    else afficherToast(json.erreur || 'Erreur', 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Envoyer le signalement'; btn.disabled = false; }
});

async function chargerSignalementsAgent() {
  const el = document.getElementById('liste-signalements-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/signalements`, { headers: { Authorization: `Bearer ${token}` } });
    const signalements = await res.json();
    if (signalements.length === 0) { el.innerHTML = '<p class="etat-vide">Aucun signalement reçu</p>'; return; }
    el.innerHTML = signalements.map(s => `
      <div class="annonce-card" style="border-left:4px solid #c0392b;">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3>🚨 ${echapper(s.type_probleme)}</h3>
            <p style="font-size:0.85rem;color:var(--gris-texte);">Citoyen: ${echapper(s.citoyen)} — ${new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <span class="badge badge-${s.statut === 'nouveau' ? 'attente' : s.statut === 'en_cours' ? 'cours' : 'resolu'}">${s.statut}</span>
        </div>
        <p>${echapper(s.description)}</p>
        ${s.localisation ? `<p style="font-size:0.85rem;color:var(--gris-texte);">📍 ${echapper(s.localisation)}</p>` : ''}
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

// LANGUE D14
async function chargerLangues() {
  try {
    const res = await fetch(`${API}/traduction/langues`);
    const langues = await res.json();
    const select = document.getElementById('selecteur-langue');
    if (!select) return;
    Object.entries(langues).forEach(([code, nom]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = nom;
      select.appendChild(option);
    });
    select.addEventListener('change', async (e) => {
      const langue = e.target.value;
      if (!langue) return;
      afficherToast('🌍 Traduction en cours...');
      const elements = document.querySelectorAll('h1, h2, h3, .nav-tab, .btn-plein, .btn-ghost, label');
      for (const el of elements) {
        const texte = el.childNodes[0]?.textContent?.trim();
        if (!texte || texte.length < 2 || texte.length > 100) continue;
        try {
          const res = await fetch(`${API}/traduction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ texte, langue_cible: langue })
          });
          const json = await res.json();
          if (json.traduction && el.childNodes[0]) el.childNodes[0].textContent = json.traduction;
        } catch {}
      }
      afficherToast(`✅ Interface traduite !`);
    });
  } catch {}
}

chargerLangues();

// ALERTES D18 F29 F31
async function chargerAlertes() {
  const el = document.getElementById('banniere-alertes');
  if (!el) return;
  try {
    const res = await fetch(`${API}/nova/alertes`);
    const alertes = await res.json();
    if (alertes.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = alertes.map(a => `
      <div class="alerte-banniere alerte-${a.type}" role="alert">
        <div><strong>${echapper(a.titre)}</strong> — ${echapper(a.message)}</div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;margin-left:1rem;" aria-label="Fermer l'alerte">×</button>
      </div>
    `).join('');
  } catch {}
}

async function chargerAlertesAgent() {
  const el = document.getElementById('liste-alertes-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/alertes`);
    const alertes = await res.json();
    if (alertes.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune alerte active</p>'; return; }
    el.innerHTML = alertes.map(a => `
      <div class="annonce-card" style="border-left:4px solid #c0392b;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <h3>${echapper(a.titre)}</h3>
            <span class="badge badge-attente">${echapper(a.type)}</span>
          </div>
          <button onclick="supprimerAlerte(${a.id}, this)" style="background:#f8d7da;border:none;padding:0.4rem 0.8rem;border-radius:8px;cursor:pointer;color:#721c24;">Désactiver</button>
        </div>
        <p style="margin-top:0.5rem;">${echapper(a.message)}</p>
        <small style="color:var(--gris-texte);">${new Date(a.created_at).toLocaleDateString('fr-FR')}</small>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

async function supprimerAlerte(id, btn) {
  btn.textContent = '...'; btn.disabled = true;
  try {
    await fetch(`${API}/nova/alertes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    afficherToast('Alerte désactivée');
    chargerAlertesAgent();
    chargerAlertes();
  } catch { afficherToast('Erreur', 'erreur'); }
}

document.getElementById('form-alerte') && document.getElementById('form-alerte').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/nova/alertes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    if (res.ok) { afficherToast('📢 Alerte publiée !'); e.target.reset(); chargerAlertesAgent(); chargerAlertes(); }
    else afficherToast('Erreur', 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Publier l\'alerte'; btn.disabled = false; }
});

chargerAlertes();

// F35 TOOLTIPS AIDE
function afficherAide(message) {
  const aide = document.createElement('div');
  aide.style.cssText = `position:fixed;top:5rem;right:1rem;padding:1rem 1.5rem;background:#1c6b7a;color:white;border-radius:10px;font-family:Inter,sans-serif;font-size:0.9rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:300px;line-height:1.5;`;
  aide.innerHTML = message + '<button onclick="this.parentElement.remove()" style="display:block;margin-top:0.5rem;background:rgba(255,255,255,0.2);border:none;color:white;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">OK</button>';
  document.body.appendChild(aide);
  setTimeout(() => aide.remove && aide.remove(), 8000);
}

const aidesOnglets = {
  'nouvelle-demande': '💡 Décrivez votre besoin clairement. Un agent traitera votre demande dans les meilleurs délais.',
  'signalement': '💡 Signalez tout problème visible dans votre secteur. Indiquez la localisation précise pour aider nos équipes.',
  'mes-demandes': '💡 Retrouvez ici toutes vos démarches. Le statut est mis à jour par nos agents en temps réel.',
  'services-citoyen': '💡 Cliquez sur un service pour en savoir plus et accéder aux démarches associées.'
};

const afficherOngletOriginal = afficherOnglet;

// F33 SUPPRESSION COMPTE
async function supprimerMonCompte() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
  try {
    const res = await fetch(`${API}/auth/compte`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      afficherToast('Compte supprimé avec succès');
      token = null; utilisateur = null;
      localStorage.removeItem('token');
      localStorage.removeItem('utilisateur');
      setTimeout(() => majAffichage(), 1500);
    }
  } catch { afficherToast('Erreur serveur', 'erreur'); }
}

// TRANSPORTS F36
async function chargerTransports() {
  const el = document.getElementById('liste-transports');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/transports`);
    const transports = await res.json();
    if (transports.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune ligne disponible</p>'; return; }
    el.innerHTML = transports.map(t => `
      <div class="transport-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3>🚀 ${echapper(t.ligne)}</h3>
            <p style="color:var(--gris-texte);font-size:0.9rem;">📍 ${echapper(t.destination)}</p>
          </div>
          <span class="badge badge-cours">${echapper(t.type)}</span>
        </div>
        <div style="margin-top:1rem;padding:0.8rem;background:#f8f9fa;border-radius:8px;">
          <p style="font-size:0.85rem;font-weight:600;margin-bottom:0.3rem;">🕐 Horaires :</p>
          <p style="font-size:0.9rem;">${echapper(t.horaires)}</p>
        </div>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}

// RENDEZ-VOUS F39 F40
document.getElementById('form-rdv') && document.getElementById('form-rdv').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/nova/rendez-vous`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) {
      afficherToast('📅 ' + json.message);
      e.target.reset();
      chargerMesRdv();
    } else afficherToast(json.erreur || 'Erreur', 'erreur');
  } catch { afficherToast('Erreur serveur', 'erreur'); }
  finally { btn.textContent = 'Confirmer le rendez-vous'; btn.disabled = false; }
});

async function chargerMesRdv() {
  const el = document.getElementById('liste-rdv');
  if (!el) return;
  try {
    const res = await fetch(`${API}/nova/rendez-vous`, { headers: { Authorization: `Bearer ${token}` } });
    const rdvs = await res.json();
    if (rdvs.length === 0) { el.innerHTML = '<p class="etat-vide">Aucun rendez-vous prévu</p>'; return; }
    el.innerHTML = '<h3 style="margin-bottom:1rem;">Mes rendez-vous</h3>' + rdvs.map(r => `
      <div class="rdv-card">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3>📅 ${echapper(r.service)}</h3>
            <p style="color:var(--gris-texte);font-size:0.9rem;">📆 ${new Date(r.date_rdv).toLocaleDateString('fr-FR')} à ${echapper(r.heure)}</p>
          </div>
          <span class="badge badge-resolu">${echapper(r.statut)}</span>
        </div>
        ${r.motif ? `<p style="margin-top:0.5rem;font-size:0.9rem;">${echapper(r.motif)}</p>` : ''}
      </div>
    `).join('');
  } catch {}
}

async function chargerRdvAgent() {
  const el = document.getElementById('liste-rdv-agent');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/rendez-vous`, { headers: { Authorization: `Bearer ${token}` } });
    const rdvs = await res.json();
    if (rdvs.length === 0) { el.innerHTML = '<p class="etat-vide">Aucun rendez-vous</p>'; return; }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:var(--ombre);">
        <thead style="background:var(--lagon-500);color:white;">
          <tr>
            <th style="padding:1rem;text-align:left;">Citoyen</th>
            <th style="padding:1rem;text-align:left;">Service</th>
            <th style="padding:1rem;text-align:left;">Date</th>
            <th style="padding:1rem;text-align:left;">Heure</th>
          </tr>
        </thead>
        <tbody>
          ${rdvs.map(r => `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:1rem;">${echapper(r.citoyen || '')}</td>
              <td style="padding:1rem;">${echapper(r.service)}</td>
              <td style="padding:1rem;">${new Date(r.date_rdv).toLocaleDateString('fr-FR')}</td>
              <td style="padding:1rem;">${echapper(r.heure)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<p class="etat-vide">Erreur</p>'; }
}

// F43 MODE DALTONIEN
function toggleDaltonien() {
  document.body.classList.toggle('daltonien');
  const btn = document.getElementById('btn-dalton');
  const actif = document.body.classList.contains('daltonien');
  btn.classList.toggle('actif', actif);
  localStorage.setItem('daltonien', actif);
}

if (localStorage.getItem('daltonien') === 'true') {
  document.body.classList.add('daltonien');
  document.getElementById('btn-dalton') && document.getElementById('btn-dalton').classList.add('actif');
}

// D12 ONBOARDING
function fermerOnboarding() {
  document.getElementById('modale-onboarding').classList.add('hidden');
  localStorage.setItem('onboarding-done', 'true');
}
// AUDIT LOG F47 F48
async function chargerAudit() {
  const el = document.getElementById('liste-audit');
  if (!el) return;
  el.innerHTML = '<p class="etat-vide">⏳ Chargement...</p>';
  try {
    const res = await fetch(`${API}/nova/audit`, { headers: { Authorization: `Bearer ${token}` } });
    const logs = await res.json();
    if (logs.length === 0) { el.innerHTML = '<p class="etat-vide">Aucune action enregistrée</p>'; return; }
    el.innerHTML = `
      <div style="background:white;border-radius:12px;padding:1.5rem;box-shadow:var(--ombre);margin-bottom:1rem;">
        <h3>📋 Journal d'audit — ${logs.length} actions</h3>
      </div>
      ${logs.map(l => `
        <div class="audit-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <strong>${echapper(l.action)}</strong>
              ${l.details ? `<p style="font-size:0.85rem;color:var(--gris-texte);margin:0.2rem 0;">${echapper(l.details)}</p>` : ''}
            </div>
            <div style="text-align:right;font-size:0.8rem;color:var(--gris-texte);">
              <div>👤 ${echapper(l.agent_nom || 'Système')}</div>
              <div>${new Date(l.created_at).toLocaleString('fr-FR')}</div>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  } catch { el.innerHTML = '<p class="etat-vide">Erreur de chargement</p>'; }
}
