/* ═══════════════════════════════════════════════════════════
   FasoMarket — js/admin.js
   Architecture : produits stockés dans produits.json sur GitHub
   Push via l'API GitHub REST + upload images via Cloudinary
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────
// CONFIG — chargée depuis localStorage
// ──────────────────────────────────────────
let CFG = {
  adminPin:      '1234',
  ghToken:       '',          // Personal Access Token GitHub
  ghOwner:       '',          // votre-pseudo
  ghRepo:        '',          // fasomarket
  ghBranch:      'main',
  cloudName:     '',          // dpn6u757a
  uploadPreset:  '',          // fasomarket_preset
  waNumber:      '22674059599',
  omMerchant:    '74059599',
};

const URL_API = "https://script.google.com/macros/s/AKfycbzocpRAaL58zWTRl-k_tNXdpI4vSzGCEWnip3LeEDTtxHNJ35-m-grPqMvzp1ElQFd9OQ/exec?spreadsheetId=16jxzNRw4gv7NOJiVpxW1fIAeA_uEn6DpilngMttuuVY&sheetName=Feuille 1";
const GITHUB_FILE = 'produits.json'; // chemin dans le dépôt

// ──────────────────────────────────────────
// ÉTAT GLOBAL
// ──────────────────────────────────────────
let products = [];
let pinBuffer = '';

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadProductsFromGitHub();
});

// ──────────────────────────────────────────
// CONFIG — localStorage
// ──────────────────────────────────────────
function loadConfig() {
  const saved = localStorage.getItem('fasomarket_cfg');
  if (saved) {
    try { CFG = { ...CFG, ...JSON.parse(saved) }; } catch(e) {}
  }
  // Remplir les champs
  document.getElementById('cfgGhToken').value      = CFG.ghToken;
  document.getElementById('cfgGhOwner').value      = CFG.ghOwner;
  document.getElementById('cfgGhRepo').value       = CFG.ghRepo;
  document.getElementById('cfgGhBranch').value     = CFG.ghBranch;
  document.getElementById('cfgCloudName').value    = CFG.cloudName;
  document.getElementById('cfgUploadPreset').value = CFG.uploadPreset;
  document.getElementById('cfgWaNumber').value     = CFG.waNumber;
  document.getElementById('cfgOmMerchant').value   = CFG.omMerchant;
}

function saveConfig() {
  CFG.ghToken      = document.getElementById('cfgGhToken').value.trim();
  CFG.ghOwner      = document.getElementById('cfgGhOwner').value.trim();
  CFG.ghRepo       = document.getElementById('cfgGhRepo').value.trim();
  CFG.ghBranch     = document.getElementById('cfgGhBranch').value.trim() || 'main';
  CFG.cloudName    = document.getElementById('cfgCloudName').value.trim();
  CFG.uploadPreset = document.getElementById('cfgUploadPreset').value.trim();
  CFG.waNumber     = document.getElementById('cfgWaNumber').value.trim();
  CFG.omMerchant   = document.getElementById('cfgOmMerchant').value.trim();
  localStorage.setItem('fasomarket_cfg', JSON.stringify(CFG));
  showToast('✅ Configuration sauvegardée');
}

function changePin() {
  const newPin = document.getElementById('cfgNewPin').value.trim();
  if (!/^\d{4}$/.test(newPin)) { showToast('⚠️ Le PIN doit contenir 4 chiffres'); return; }
  CFG.adminPin = newPin;
  localStorage.setItem('fasomarket_cfg', JSON.stringify(CFG));
  document.getElementById('cfgNewPin').value = '';
  showToast('✅ PIN mis à jour');
}

// ──────────────────────────────────────────
// ÉCRAN PIN
// ──────────────────────────────────────────
function pinKey(val) {
  if (val === 'clear') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else {
    if (pinBuffer.length >= 4) return;
    pinBuffer += val;
  }
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(verifyPin, 120);
}

function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, i) =>
    dot.classList.toggle('filled', i < pinBuffer.length)
  );
}

function verifyPin() {
  if (pinBuffer === CFG.adminPin) {
    document.getElementById('pinScreen').style.display  = 'none';
    document.getElementById('adminPanel').classList.add('visible');
    loadAdminList();
  } else {
    document.getElementById('pinError').textContent = '❌ Code incorrect. Réessayez.';
    pinBuffer = '';
    updatePinDots();
    navigator.vibrate && navigator.vibrate([100, 50, 100]);
    setTimeout(() => { document.getElementById('pinError').textContent = ''; }, 2000);
  }
}

// ──────────────────────────────────────────
// ONGLETS
// ──────────────────────────────────────────
function switchTab(tabId, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');
  if (tabId === 'liste') loadAdminList();
}

// ──────────────────────────────────────────
// GITHUB API — lecture de produits.json
// ──────────────────────────────────────────
async function loadProductsFromGitHub() {
  try {
    const response = await fetch(URL_API);
    products = await response.json();
    renderAdminList(); 
  } catch (error) {
    console.error("Erreur Google Sheets :", error);
    showToast("⚠️ Impossible de charger les produits.");
  }
}


// ──────────────────────────────────────────
// CLOUDINARY UPLOAD
// ──────────────────────────────────────────
async function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('⚠️ Image trop lourde (max 10 Mo)'); return; }
  if (!CFG.cloudName || !CFG.uploadPreset) {
    showToast('⚠️ Configurez Cloudinary dans l\'onglet Config');
    return;
  }

  showUploadProgress(true, 'Envoi vers Cloudinary…');
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CFG.uploadPreset);

    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CFG.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    document.getElementById('fImageUrl').value = data.secure_url;
    showImagePreview(data.secure_url, file.name);
    showToast('✅ Image uploadée avec succès !');
  } catch(e) {
    showToast('❌ Échec upload : ' + e.message);
  } finally {
    showUploadProgress(false);
    input.value = '';
  }
}

function showUploadProgress(show, text = '') {
  const el  = document.getElementById('imgUploadProgress');
  const txt = document.getElementById('imgUploadProgressText');
  el.classList.toggle('show', show);
  if (text) txt.textContent = text;
  const area = document.getElementById('imgUploadArea');
  area.style.opacity       = show ? '0.4' : '1';
  area.style.pointerEvents = show ? 'none' : '';
}

function showImagePreview(url, filename) {
  document.getElementById('imgPreviewThumb').src        = url;
  document.getElementById('imgPreviewName').textContent = filename || 'Image uploadée ✅';
  document.getElementById('imgPreviewUrl').textContent  = url;
  document.getElementById('imgPreviewWrap').classList.add('show');
  document.getElementById('imgUploadArea').style.display = 'none';
  document.getElementById('imgUploadProgress').classList.remove('show');
}

function removeImage() {
  document.getElementById('fImageUrl').value = '';
  document.getElementById('imgPreviewWrap').classList.remove('show');
  document.getElementById('imgPreviewThumb').src = '';
  document.getElementById('imgPreviewUrl').textContent = '';
  document.getElementById('imgUploadArea').style.display = '';
}

function syncUrlToPreview(url) {
  if (url && url.startsWith('http')) {
    showImagePreview(url, 'URL externe');
  } else if (!url) {
    removeImage();
  }
}

// ──────────────────────────────────────────
// SAUVEGARDE PRODUIT → GitHub
// ──────────────────────────────────────────
async function sauvegarderProduit() {
  const nom       = document.getElementById('fNom').value.trim();
  const prix      = parseInt(document.getElementById('fPrix').value);
  const categorie = document.getElementById('fCategorie').value;
  const desc      = document.getElementById('fDesc').value.trim();
  const emoji     = document.getElementById('fEmoji').value.trim() || '📦';
  const imageUrl  = document.getElementById('fImageUrl').value.trim();
  const statut    = document.getElementById('fStatut').value;
  const editId    = document.getElementById('fEditId').value;

  if (!nom || !prix || !categorie) {
    showToast('⚠️ Nom, prix et catégorie sont obligatoires');
    return;
  }

  const product = {
    id:          editId ? parseInt(editId) : Date.now(),
    nom, prix, categorie,
    description: desc,
    emoji,
    imageUrl,
    statut,
  };
  showToast("⏳ Envoi vers Google Sheets...");
  
  try {
    const response = await fetch(URL_API, {
      method: "POST",
      body: JSON.stringify(product)
    });
    
    const resultat = await response.json();
    
    if (resultat.status === "success") {
      showToast("✅ Enregistré dans Google Sheets !");
      resetForm(); // Vide le formulaire
      loadProductsFromGitHub();
       ; // Recharge le tableau admin
    } else {
      showToast("⚠️ Erreur : " + resultat.message);
    }
  } catch (error) {
    console.error("Erreur d'envoi :", error);
    showToast("❌ Échec de la connexion.");
  }
}


function showPushStatus(type, text) {
  const el   = document.getElementById('pushStatus');
  const spin = document.getElementById('pushSpinner');
  const txt  = document.getElementById('pushStatusText');
  el.className = 'push-status show ' + type;
  spin.style.display = type === 'loading' ? 'block' : 'none';
  txt.textContent    = text;
  if (type !== 'loading') setTimeout(() => el.classList.remove('show'), 6000);
}

// ──────────────────────────────────────────
// LISTE PRODUITS ADMIN
// ──────────────────────────────────────────
function loadAdminList() {
  const list = document.getElementById('adminList');
  if (!products.length) {
    list.innerHTML = `<div class="empty-state"><div class="ico">📦</div><p>Aucun produit ajouté</p></div>`;
    return;
  }
  list.innerHTML = products.map(p => {
    const imgSrc = p.imageUrl || p.image || '';
    return `
    <div class="admin-item">
      <div class="admin-thumb">
        ${imgSrc
          ? `<img src="${escHtml(imgSrc)}" onerror="this.style.display='none'">`
          : escHtml(p.emoji || '📦')}
      </div>
      <div class="admin-item-info">
        <div class="admin-item-name">${escHtml(p.nom)}</div>
        <div class="admin-item-price">${formatPrix(p.prix)}</div>
        <div class="admin-item-cat">${escHtml(p.categorie)}</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn-del"  onclick="deleteProduct(${p.id})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('fNom').value              = p.nom;
  document.getElementById('fPrix').value             = p.prix;
  document.getElementById('fCategorie').value        = p.categorie;
  document.getElementById('fDesc').value             = p.description || '';
  document.getElementById('fEmoji').value            = p.emoji || '';
  document.getElementById('fImageUrl').value         = p.imageUrl || p.image || '';
  document.getElementById('fStatut').value           = p.statut || 'normal';
  document.getElementById('fEditId').value           = p.id;
  document.getElementById('btnSauvegarder').textContent = '💾 Mettre à jour';
  if (p.imageUrl || p.image) {
    showImagePreview(p.imageUrl || p.image, 'Image actuelle');
  } else {
    removeImage();
  }
  switchTab('ajouter', document.querySelectorAll('.admin-tab')[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  showPushStatus('loading', '⏳ Suppression sur GitHub…');
  try {
    const { content: remoteProducts, sha } = await getGitHubFile();
    const updated = remoteProducts.filter(p => p.id !== id);
    await putGitHubFile(updated, sha);
    products = updated;
    loadAdminList();
    showPushStatus('success', '✅ Produit supprimé !');
    showToast('🗑️ Produit supprimé');
  } catch(e) {
    showPushStatus('error', '❌ ' + e.message);
    showToast('❌ ' + e.message);
  }
}

function resetForm() {
  document.getElementById('fNom').value       = '';
  document.getElementById('fPrix').value      = '';
  document.getElementById('fCategorie').selectedIndex = 0;
  document.getElementById('fDesc').value      = '';
  document.getElementById('fEmoji').value     = '';
  document.getElementById('fImageUrl').value  = '';
  document.getElementById('fStatut').selectedIndex = 0;
  document.getElementById('fEditId').value    = '';
  document.getElementById('btnSauvegarder').textContent = '✅ Sauvegarder le produit';
  removeImage();
}

// ──────────────────────────────────────────
// EXPORT / DANGER
// ──────────────────────────────────────────
function exportData() {
  const json = JSON.stringify(products, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'produits.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('📤 produits.json exporté');
}

async function clearAllData() {
  if (!confirm('⚠️ Supprimer TOUS les produits ? Cette action met à jour GitHub immédiatement.')) return;
  showPushStatus('loading', '⏳ Suppression sur GitHub…');
  try {
    const { sha } = await getGitHubFile();
    await putGitHubFile([], sha);
    products = [];
    loadAdminList();
    showPushStatus('success', '✅ Catalogue vidé !');
    showToast('🗑️ Tous les produits supprimés');
  } catch(e) {
    showPushStatus('error', '❌ ' + e.message);
    showToast('❌ ' + e.message);
  }
}

// ──────────────────────────────────────────
// UTILITAIRES
// ──────────────────────────────────────────
function formatPrix(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' F CFA';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
