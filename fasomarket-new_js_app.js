/* ═══════════════════════════════════════════════════════════
   FasoMarket — js/app.js
   Architecture : fetch produits.json → rendu HTML pur
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────
// CONFIG — personnalisable sans toucher au reste
// ──────────────────────────────────────────
const CONFIG = {
  WA_NUMBER:   '22674059599',
  OM_MERCHANT: '74059599',
};

// USSD : le # doit être encodé %23 dans les liens tel:
function buildUssdCode(montant) {
  return `*144*2*1*${CONFIG.OM_MERCHANT}*${montant}#`;
}

// ──────────────────────────────────────────
// ÉTAT GLOBAL
// ──────────────────────────────────────────
let state = {
  allProducts:      [],
  filteredProducts: [],
  currentCategory:  'all',
  currentSearch:    '',
  currentProduct:   null,
  currentOMProduct: null,
};

// ──────────────────────────────────────────
// CHARGEMENT PRODUITS (fetch produits.json)
// ──────────────────────────────────────────
async function loadProducts() {
  try {
    // Ajout d'un timestamp pour éviter le cache navigateur en dev
    const resp = await fetch('./produits.json?t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    state.allProducts = Array.isArray(data) ? data : [];
    renderAll();
  } catch (e) {
    console.error('Erreur chargement produits.json :', e);
    document.getElementById('productGrid').innerHTML =
      `<div class="no-results">
        <div class="ico">⚠️</div>
        <p>Impossible de charger le catalogue.<br>Vérifiez votre connexion.</p>
       </div>`;
  }
}

// ──────────────────────────────────────────
// RENDU
// ──────────────────────────────────────────
function renderAll() {
  renderCategories();
  applyFilters();
}

const CAT_EMOJIS = {
  'all': '🛍️',
  'Matériel médical': '🩺',
  'Tenues scolaires': '🥼',
  'Diagnostic': '🔬',
  'Consommables': '🧤',
  'Équipements': '⚕️',
};

function renderCategories() {
  const cats = ['all', ...new Set(state.allProducts.map(p => p.categorie))];
  const scroll = document.getElementById('catScroll');
  scroll.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-chip' + (cat === state.currentCategory ? ' active' : '');
    btn.setAttribute('data-cat', cat);
    btn.onclick = () => filterByCategory(cat, btn);
    btn.innerHTML = `<span class="cat-emoji">${CAT_EMOJIS[cat] || '📦'}</span> ${cat === 'all' ? 'Tous' : cat}`;
    scroll.appendChild(btn);
  });
}

function applyFilters() {
  let products = [...state.allProducts];
  if (state.currentCategory !== 'all')
    products = products.filter(p => p.categorie === state.currentCategory);
  if (state.currentSearch) {
    const q = state.currentSearch.toLowerCase().trim();
    products = products.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.categorie || '').toLowerCase().includes(q)
    );
  }
  state.filteredProducts = products;
  renderProducts(products);
  updateSearchCount(products.length);
}

function renderProducts(products) {
  const grid    = document.getElementById('productGrid');
  const countEl = document.getElementById('productsCount');
  countEl.textContent = `${products.length} produit${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = `<div class="no-results"><div class="ico">🔍</div><p>Aucun produit trouvé</p></div>`;
    return;
  }

  // Chaque produit utilise imageUrl (nouvelle archi) ou image (legacy)
  grid.innerHTML = products.map(p => {
    const imgSrc = p.imageUrl || p.image || '';
    return `
    <div class="product-card" onclick="openProduct(${p.id})">
      <div class="product-img-wrap">
        ${imgSrc
          ? `<img src="${escHtml(imgSrc)}" alt="${escHtml(p.nom)}" loading="lazy"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <span class="product-emoji" style="${imgSrc ? 'display:none' : ''}">${escHtml(p.emoji || '📦')}</span>
        ${p.statut && p.statut !== 'normal'
          ? `<div class="product-badge ${p.statut === 'new' ? 'new' : ''}">${p.statut === 'new' ? 'Nouveau' : 'Promo'}</div>`
          : ''}
      </div>
      <div class="product-info">
        <div class="product-cat">${escHtml(p.categorie)}</div>
        <div class="product-name">${escHtml(p.nom)}</div>
        <div class="product-desc">${escHtml(p.description || '')}</div>
        <div class="product-footer">
          <div class="product-price">${formatPrix(p.prix)}</div>
          <button class="btn-add"
                  onclick="event.stopPropagation();commanderWA(${p.id})"
                  aria-label="Commander">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ──────────────────────────────────────────
// FILTRES
// ──────────────────────────────────────────
function filterByCategory(cat, btn) {
  state.currentCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function filterProducts(val) {
  state.currentSearch = val;
  document.getElementById('searchClear').classList.toggle('show', val.length > 0);
  applyFilters();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  filterProducts('');
}

function updateSearchCount(count) {
  const el = document.getElementById('searchCount');
  el.textContent = state.currentSearch
    ? `${count} résultat${count !== 1 ? 's' : ''} pour "${state.currentSearch}"`
    : '';
}

// ──────────────────────────────────────────
// MODAL PRODUIT
// ──────────────────────────────────────────
function openProduct(id) {
  const p = state.allProducts.find(x => x.id === id);
  if (!p) return;
  state.currentProduct = p;
  const imgSrc = p.imageUrl || p.image || '';

  document.getElementById('modalProduitContent').innerHTML = `
    ${imgSrc
      ? `<img class="modal-product-img" src="${escHtml(imgSrc)}" alt="${escHtml(p.nom)}" onerror="this.style.display='none'">`
      : `<div class="modal-product-emoji">${escHtml(p.emoji || '📦')}</div>`}
    <div class="modal-cat-badge">${escHtml(p.categorie)}</div>
    <div class="modal-product-name">${escHtml(p.nom)}</div>
    <div class="modal-product-price">${formatPrix(p.prix)}</div>
    <div class="modal-product-desc">${escHtml(p.description || '')}</div>
    <div class="modal-actions">
      <button class="btn-primary-full" onclick="commanderWA(${p.id})">💬 Commander sur WhatsApp</button>
      <button class="btn-om-full" onclick="ouvrirPaiementOM(${p.id})">📱 Payer avec Orange Money</button>
    </div>`;

  openModal('modalProduit');
}

function closeModalProduct(e) {
  if (e.target === document.getElementById('modalProduit')) closeModal('modalProduit');
}

// ──────────────────────────────────────────
// ORANGE MONEY — USSD DIRECT
// ──────────────────────────────────────────
function ouvrirPaiementOM(productId) {
  closeModal('modalProduit');
  if (productId !== null) {
    const p = state.allProducts.find(x => x.id === productId);
    state.currentOMProduct = p || null;
    if (p) {
      document.getElementById('omInputWrap').style.display = 'none';
      document.getElementById('omAmountDisplay').textContent = formatPrix(p.prix);
      document.getElementById('omManualAmount').value = p.prix;
    }
  } else {
    state.currentOMProduct = null;
    document.getElementById('omInputWrap').style.display = '';
    document.getElementById('omManualAmount').value = '';
    document.getElementById('omAmountDisplay').textContent = '0 FCFA';
  }
  openModal('modalOM');
}

function updateOmAmount(val) {
  const n = parseInt(val) || 0;
  document.getElementById('omAmountDisplay').textContent = n > 0 ? formatPrix(n) : '0 FCFA';
}

function lancerUSSD() {
  const p = state.currentOMProduct;
  const montant = p ? p.prix : (parseInt(document.getElementById('omManualAmount').value) || 0);
  if (!montant) { showToast('⚠️ Entrez un montant'); return; }
  // Le # doit être encodé %23 sinon le téléphone coupe le code USSD
  const telUrl = 'tel:' + buildUssdCode(montant).replace(/#/g, '%23').replace(/\*/g, '%2A');
  window.location.href = telUrl;
}

function envoiWhatsAppOM() {
  const p = state.currentOMProduct;
  const montantNum = p ? p.prix : (parseInt(document.getElementById('omManualAmount').value) || 0);
  const montant    = montantNum > 0 ? formatPrix(montantNum) : 'montant à préciser';
  const nomProduit = p ? p.nom : 'commande';

  const msg = `📱 *Paiement Orange Money - FasoMarket*\n\n` +
    `📦 Produit : ${nomProduit}\n` +
    `💰 Montant : ${montant}\n` +
    `📲 Code USSD : ${buildUssdCode(montantNum || 'X')}\n\n` +
    `Je confirme avoir effectué mon paiement.`;

  openWhatsApp(msg);
  closeModal('modalOM');
}

function closeModalOM(e) {
  if (e.target === document.getElementById('modalOM')) closeModal('modalOM');
}

// ──────────────────────────────────────────
// WHATSAPP
// ──────────────────────────────────────────
function commanderWA(productId) {
  const p = state.allProducts.find(x => x.id === productId);
  if (!p) return;
  const msg = `Bonjour FasoMarket ! 👋\n\nJe suis intéressé(e) par :\n📦 *${p.nom}*\n💰 Prix : ${formatPrix(p.prix)}\n\nPouvez-vous me confirmer la disponibilité et les modalités de livraison ?`;
  openWhatsApp(msg);
}

function openWhatsApp(msg) {
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ──────────────────────────────────────────
// MODALS
// ──────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

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

function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadProducts);
